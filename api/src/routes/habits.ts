import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { buildExport, toCsv } from "../lib/exportData.js";
import { computeInsights } from "../lib/insights.js";
import { checkOrder, checkTimes, nextSortOrder } from "../lib/order.js";
import { amountCap, countAsDone, resolveProgress } from "../lib/progress.js";
import {
  isNearToday,
  isOnOrAfterHabitStart,
  isScheduledOn,
  isTickableDay,
  scheduledDaysInWindow,
  shiftDay,
  toDbDate,
  todayUTC,
} from "../lib/dates.js";
import {
  countAsDoneBody,
  dayQuery,
  habitBody,
  exportQuery,
  habitUpdateBody,
  historyQuery,
  idParams,
  insightsQuery,
  noteBody,
  orderBody,
  progressBody,
  skipBody,
  statsQuery,
  toggleBody,
} from "../schemas/habit.js";

export const habitsRouter = Router();

// List habits + whether each is done on a given date
habitsRouter.get("/", async (req, res) => {
  const userId: number = res.locals.userId;
  const { date, archived } = dayQuery.parse(req.query);
  const day = toDbDate(date ?? todayUTC());

  const habits = await prisma.habit.findMany({
    where: {
      userId,
      archivedAt: archived === "true" ? { not: null } : null,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      logs: { where: { date: day }, select: { id: true } },
      skips: { where: { date: day }, select: { id: true } },
      progress: { where: { date: day }, select: { amount: true, target: true } },
      notes: { where: { date: day }, select: { text: true } },
    },
  });
  res.json(
    habits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      icon: h.icon,
      scheduleDays: h.scheduleDays,
      archivedAt: h.archivedAt,
      doneOnDate: h.logs.length > 0,
      skippedOnDate: h.skips.length > 0,
      target: h.target,
      unit: h.unit,
      timeOfDay: h.timeOfDay,
      // how much was logged that day (null when it was ticked with the plain checkbox)
      amountOnDate: h.progress[0]?.amount ?? null,
      // the note written on that day, if any
      note: h.notes[0]?.text ?? null,
      // a finished day keeps the target it was reached under (1 for a plain tick)
      targetOnDate: h.logs.length > 0 ? (h.progress[0]?.target ?? 1) : h.target,
    })),
  );
});

// Stats: completions per habit over the last N days (raw SQL)
// NOTE: defined before any "/:id" GET route so "stats" isn't treated as an id
habitsRouter.get("/stats", async (req, res) => {
  const userId: number = res.locals.userId;
  const { days, today } = statsQuery.parse(req.query);
  const end = today ?? todayUTC();
  const since = toDbDate(shiftDay(end, -(days - 1)));
  const until = toDbDate(end);

  const rows = await prisma.$queryRaw<
    {
      id: number;
      name: string;
      icon: string | null;
      scheduleDays: number;
      completions: number;
    }[]
  >`
    SELECT h.id, h.name, h.icon, h."scheduleDays", COUNT(l.id)::int AS completions
    FROM "Habit" h
    LEFT JOIN "HabitLog" l
      ON l."habitId" = h.id
      AND l.date >= ${since}::date
      AND l.date <= ${until}::date
    WHERE h."userId" = ${userId} AND h."archivedAt" IS NULL
    GROUP BY h.id, h.name, h.icon, h."scheduleDays"
    ORDER BY h.id
  `;

  // skipped days come off the scheduled count (only those the habit is still scheduled on)
  const skipRows = await prisma.habitSkip.findMany({
    where: { habit: { userId, archivedAt: null }, date: { gte: since, lte: until } },
    select: { habitId: true, date: true },
  });
  const skipsByHabit = new Map<number, string[]>();
  for (const s of skipRows) {
    const list = skipsByHabit.get(s.habitId) ?? [];
    list.push(s.date.toISOString().slice(0, 10));
    skipsByHabit.set(s.habitId, list);
  }

  res.json({
    days,
    habits: rows.map(({ scheduleDays, ...h }) => {
      const skipped = (skipsByHabit.get(h.id) ?? []).filter((d) => isScheduledOn(d, scheduleDays));
      return {
        ...h,
        // how many of those days each habit was actually scheduled on, minus skipped days
        scheduled: Math.max(0, scheduledDaysInWindow(end, days, scheduleDays) - skipped.length),
      };
    }),
  });
});

// History: the dates each habit was completed within [from, to]
// NOTE: also defined before "/:id" so "history" isn't treated as an id
habitsRouter.get("/history", async (req, res) => {
  const userId: number = res.locals.userId;
  const { from, to, archived } = historyQuery.parse(req.query);
  const archivedFilter = archived === "true" ? { not: null } : null;

  const [habits, logs, skipRows] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, archivedAt: archivedFilter },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        scheduleDays: true,
        target: true,
        unit: true,
        timeOfDay: true,
        createdAt: true,
      },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { userId, archivedAt: archivedFilter },
        date: { gte: toDbDate(from), lte: toDbDate(to) },
      },
      orderBy: { date: "asc" },
      select: { habitId: true, date: true },
    }),
    prisma.habitSkip.findMany({
      where: {
        habit: { userId, archivedAt: archivedFilter },
        date: { gte: toDbDate(from), lte: toDbDate(to) },
      },
      orderBy: { date: "asc" },
      select: { habitId: true, date: true },
    }),
  ]);

  const skipsByHabit = new Map<number, string[]>();
  for (const s of skipRows) {
    const list = skipsByHabit.get(s.habitId) ?? [];
    list.push(s.date.toISOString().slice(0, 10));
    skipsByHabit.set(s.habitId, list);
  }

  const datesByHabit = new Map<number, string[]>();
  for (const log of logs) {
    const list = datesByHabit.get(log.habitId) ?? [];
    list.push(log.date.toISOString().slice(0, 10));
    datesByHabit.set(log.habitId, list);
  }

  res.json({
    from,
    to,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      icon: h.icon,
      scheduleDays: h.scheduleDays,
      target: h.target,
      unit: h.unit,
      timeOfDay: h.timeOfDay,
      createdAt: h.createdAt,
      dates: datesByHabit.get(h.id) ?? [],
      skips: skipsByHabit.get(h.id) ?? [],
    })),
  });
});

// Export everything the user has, archived habits included.
// NOTE: defined before "/:id" so "export" isn't treated as an id
habitsRouter.get("/export", async (req, res) => {
  const userId: number = res.locals.userId;
  const { format } = exportQuery.parse(req.query);

  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      scheduleDays: true,
      target: true,
      unit: true,
      sortOrder: true,
      timeOfDay: true,
      archivedAt: true,
      createdAt: true,
      logs: { select: { date: true }, orderBy: { date: "asc" } },
      skips: { select: { date: true }, orderBy: { date: "asc" } },
      progress: { select: { date: true, amount: true, target: true } },
      notes: { select: { date: true, text: true } },
    },
  });

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { nickname: true, avatarIcon: true, avatarColor: true, accent: true },
  });
  const data = buildExport(habits, new Date(), profile);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="habbit-export-${data.exportedAt.slice(0, 10)}.${format}"`,
  );
  if (format === "csv") {
    res.type("text/csv").send(toCsv(data));
  } else {
    res.json(data);
  }
});

// Insights: strongest and weakest weekday, 30-day trend, strongest and weakest habit
// NOTE: also defined before "/:id"
habitsRouter.get("/insights", async (req, res) => {
  const userId: number = res.locals.userId;
  const { days, today } = insightsQuery.parse(req.query);
  const end = today ?? todayUTC();
  const since = toDbDate(shiftDay(end, -(days - 1)));

  const habits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      scheduleDays: true,
      createdAt: true,
      logs: {
        where: { date: { gte: since, lte: toDbDate(end) } },
        select: { date: true },
      },
      skips: {
        where: { date: { gte: since, lte: toDbDate(end) } },
        select: { date: true },
      },
    },
  });

  res.json(
    computeInsights(
      habits.map((h) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        scheduleDays: h.scheduleDays,
        // the UTC day it was created; a habit counts from that day on
        created: h.createdAt.toISOString().slice(0, 10),
        dates: new Set(h.logs.map((l) => l.date.toISOString().slice(0, 10))),
        skips: new Set(h.skips.map((s) => s.date.toISOString().slice(0, 10))),
      })),
      end,
      days,
    ),
  );
});

// Save a new order for the habits: the ids, first to last
habitsRouter.put("/order", async (req, res) => {
  const userId: number = res.locals.userId;
  const { ids, timeOfDay } = orderBody.parse(req.body ?? {});

  const owned = await prisma.habit.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  const check = checkOrder(ids, new Set(owned.map((h) => h.id)));
  if (!check.ok) throw new HttpError(check.reason === "Habit not found" ? 404 : 400, check.reason);

  const times = timeOfDay ?? {};
  const timesCheck = checkTimes(times, ids);
  if (!timesCheck.ok) throw new HttpError(400, timesCheck.reason);

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.habit.updateMany({
        where: { id, userId },
        data: { sortOrder: index, ...(times[String(id)] ? { timeOfDay: times[String(id)] } : {}) },
      }),
    ),
  );
  res.json({ ids });
});

// A habit's notes, newest first. Capped so one request stays small.
habitsRouter.get("/:id/notes", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const habit = await prisma.habit.findFirst({ where: { id, userId }, select: { id: true } });
  if (!habit) throw new HttpError(404, "Habit not found");

  const notes = await prisma.habitNote.findMany({
    where: { habitId: id },
    orderBy: { date: "desc" },
    take: 366,
    select: { date: true, text: true },
  });
  res.json(notes.map((n) => ({ date: n.date.toISOString().slice(0, 10), text: n.text })));
});

// Set (or, with empty text, remove) the note on one day
habitsRouter.put("/:id/note", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const { date, text } = noteBody.parse(req.body ?? {});
  if (!isTickableDay(date)) {
    throw new HttpError(400, "That day is outside the range you can edit");
  }
  const day = toDbDate(date);

  const habit = await prisma.habit.findFirst({ where: { id, userId }, select: { id: true } });
  if (!habit) throw new HttpError(404, "Habit not found");

  if (text === "") {
    await prisma.habitNote.deleteMany({ where: { habitId: id, date: day } });
    res.json({ id, date, text: null });
    return;
  }
  await prisma.habitNote.upsert({
    where: { habitId_date: { habitId: id, date: day } },
    create: { habitId: id, date: day, text },
    update: { text },
  });
  res.json({ id, date, text });
});

// Get a single habit
habitsRouter.get("/:id", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const habit = await prisma.habit.findFirst({
    where: { id, userId },
  });

  if (!habit) throw new HttpError(404, "No habit found");

  res.json({
    id: habit.id,
    name: habit.name,
    color: habit.color,
    icon: habit.icon,
    scheduleDays: habit.scheduleDays,
    target: habit.target,
    unit: habit.unit,
    timeOfDay: habit.timeOfDay,
    createdAt: habit.createdAt,
  });
});

// Create
habitsRouter.post("/", async (req, res) => {
  const userId: number = res.locals.userId;
  const { name, color, icon, scheduleDays, target, unit, timeOfDay } = habitBody.parse(req.body);
  // a new habit goes to the end of the list
  const last = await prisma.habit.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const habit = await prisma.habit.create({
    data: {
      name,
      color,
      icon,
      scheduleDays,
      target,
      unit: unit || null,
      timeOfDay,
      sortOrder: nextSortOrder(last._max.sortOrder),
      userId,
    },
  });
  res.status(201).json(habit);
});

// Update
habitsRouter.patch("/:id", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const { archived, today, ...changes } = habitUpdateBody.parse(req.body);
  if (today !== undefined && !isNearToday(today)) {
    throw new HttpError(400, "That is not a valid date for today");
  }

  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Habit not found");

  await prisma.$transaction(async (tx) => {
    await tx.habit.update({
      where: { id },
      data: {
        ...changes,
        ...(archived === undefined
          ? {}
          : { archivedAt: archived ? new Date() : null }),
      },
    });

    // Lowering the goal applies from today: if today already has enough for the new goal,
    // it is finished now. Other days are never re-checked.
    if (changes.target !== undefined && changes.target < existing.target) {
      const day = toDbDate(today ?? todayUTC());
      const progress = await tx.habitProgress.findFirst({ where: { habitId: id, date: day } });
      const log = await tx.habitLog.findFirst({ where: { habitId: id, date: day } });
      if (progress && !log && progress.amount >= changes.target) {
        await tx.habitSkip.deleteMany({ where: { habitId: id, date: day } });
        await tx.habitLog.create({ data: { habitId: id, date: day } });
        await tx.habitProgress.update({ where: { id: progress.id }, data: { target: changes.target } });
      }
    }
  });

  const habit = await prisma.habit.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      scheduleDays: true,
      archivedAt: true,
    },
  });
  res.json(habit);
});

// Delete
habitsRouter.delete("/:id", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);

  const result = await prisma.habit.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) throw new HttpError(404, "Habit not found");

  res.status(204).end();
});

// Toggle done/undone for a date (inside a transaction)
habitsRouter.post("/:id/toggle", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const { date } = toggleBody.parse(req.body ?? {});
  if (date !== undefined && !isTickableDay(date)) {
    throw new HttpError(400, "That day is outside the range you can edit");
  }
  const day = toDbDate(date ?? todayUTC());

  // Make sure the habit exists AND belongs to this user
  const habit = await prisma.habit.findFirst({
    where: { id, userId },
  });
  if (!habit) throw new HttpError(404, "Habit not found");
  if (!isOnOrAfterHabitStart(date ?? todayUTC(), habit.createdAt)) {
    throw new HttpError(400, "That habit did not exist yet on that day");
  }

  const done = await prisma.$transaction(async (tx) => {
    const deleted = await tx.habitLog.deleteMany({
      where: { habitId: id, date: day },
    });
    if (deleted.count > 0) {
      await tx.habitProgress.deleteMany({ where: { habitId: id, date: day } });
      return false;
    }

    // ticking a skipped day replaces the skip
    await tx.habitSkip.deleteMany({ where: { habitId: id, date: day } });
    await tx.habitLog.create({ data: { habitId: id, date: day } });
    if (habit.target > 1) {
      // a counted habit ticked in one go counts as the full target
      await tx.habitProgress.upsert({
        where: { habitId_date: { habitId: id, date: day } },
        create: { habitId: id, date: day, amount: habit.target, target: habit.target },
        update: { amount: habit.target, target: habit.target },
      });
    }
    return true;
  });

  res.json({ id, date: day.toISOString().slice(0, 10), done });
});

// Set how much of a counted habit was done on a day. Reaching the target finishes the day.
habitsRouter.post("/:id/progress", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const { date, amount } = progressBody.parse(req.body ?? {});
  if (!isTickableDay(date)) {
    throw new HttpError(400, "That day is outside the range you can edit");
  }
  const day = toDbDate(date);

  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) throw new HttpError(404, "Habit not found");
  if (!isOnOrAfterHabitStart(date, habit.createdAt)) {
    throw new HttpError(400, "That habit did not exist yet on that day");
  }

  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.habitLog.findFirst({ where: { habitId: id, date: day } });
    const existing = await tx.habitProgress.findFirst({ where: { habitId: id, date: day } });
    // a plain tick (no progress row) was finished under a target of 1
    const doneTarget = log ? (existing?.target ?? 1) : null;
    if (amount > amountCap(Math.max(habit.target, doneTarget ?? 0))) {
      throw new HttpError(400, "That amount is too high");
    }

    const outcome = resolveProgress(amount, habit.target, doneTarget);
    if (outcome.kind === "clear") {
      await tx.habitProgress.deleteMany({ where: { habitId: id, date: day } });
      await tx.habitLog.deleteMany({ where: { habitId: id, date: day } });
      return { amount: 0, target: habit.target, done: false };
    }

    await tx.habitProgress.upsert({
      where: { habitId_date: { habitId: id, date: day } },
      create: { habitId: id, date: day, amount, target: outcome.storedTarget },
      update: { amount, target: outcome.storedTarget },
    });
    if (outcome.done && !log) {
      await tx.habitSkip.deleteMany({ where: { habitId: id, date: day } });
      await tx.habitLog.create({ data: { habitId: id, date: day } });
    } else if (!outcome.done && log) {
      await tx.habitLog.deleteMany({ where: { habitId: id, date: day } });
    }
    return { amount, target: outcome.storedTarget, done: outcome.done };
  });

  res.json({ id, date, ...result });
});

// Count a day with some progress as done, at what was done: that day's goal becomes the
// amount, and the habit's own target is left alone.
habitsRouter.post("/:id/count-as-done", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const { date } = countAsDoneBody.parse(req.body ?? {});
  if (!isTickableDay(date)) {
    throw new HttpError(400, "That day is outside the range you can edit");
  }
  const day = toDbDate(date);

  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) throw new HttpError(404, "Habit not found");
  if (!isOnOrAfterHabitStart(date, habit.createdAt)) {
    throw new HttpError(400, "That habit did not exist yet on that day");
  }

  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.habitLog.findFirst({ where: { habitId: id, date: day } });
    const progress = await tx.habitProgress.findFirst({ where: { habitId: id, date: day } });
    const stored = progress ? countAsDone(progress.amount, habit.target, !!log) : null;
    if (!progress || stored === null) {
      throw new HttpError(409, "There is nothing to count as done on that day");
    }
    await tx.habitProgress.update({ where: { id: progress.id }, data: { target: stored } });
    await tx.habitSkip.deleteMany({ where: { habitId: id, date: day } });
    await tx.habitLog.create({ data: { habitId: id, date: day } });
    return { amount: progress.amount, target: stored, done: true };
  });

  res.json({ id, date, ...result });
});

// Skip (or un-skip) a scheduled day that has not been completed
habitsRouter.post("/:id/skip", async (req, res) => {
  const userId: number = res.locals.userId;
  const { id } = idParams.parse(req.params);
  const { date } = skipBody.parse(req.body ?? {});
  if (!isTickableDay(date)) {
    throw new HttpError(400, "That day is outside the range you can edit");
  }
  const day = toDbDate(date);

  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) throw new HttpError(404, "Habit not found");
  if (!isOnOrAfterHabitStart(date, habit.createdAt)) {
    throw new HttpError(400, "That habit did not exist yet on that day");
  }
  if (!isScheduledOn(date, habit.scheduleDays)) {
    throw new HttpError(400, "That habit is not scheduled on that day");
  }

  const skipped = await prisma.$transaction(async (tx) => {
    const removed = await tx.habitSkip.deleteMany({ where: { habitId: id, date: day } });
    if (removed.count > 0) return false;
    const done = await tx.habitLog.findFirst({ where: { habitId: id, date: day } });
    if (done) throw new HttpError(409, "That day is already done");
    await tx.habitSkip.create({ data: { habitId: id, date: day } });
    return true;
  });

  res.json({ id, date, skipped });
});
