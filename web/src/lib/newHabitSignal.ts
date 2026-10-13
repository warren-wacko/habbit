// A small message from anywhere in the app to the Today screen: "open the new-habit screen".
// The tour uses it for "Add my first habit". It works whether Today is already showing or is
// still on its way: if nobody is listening yet, the request waits until Today appears.

const EVENT = "habbit:new-habit";
let pending = false;

/** Ask for the new-habit screen to open */
export function requestNewHabit(): void {
  pending = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** True once for each request, so it opens a single time */
export function takeNewHabitRequest(): boolean {
  const was = pending;
  pending = false;
  return was;
}

/** Listen while Today is showing. Returns the function that stops listening. */
export function onNewHabitRequest(open: () => void): () => void {
  const handler = () => {
    if (takeNewHabitRequest()) open();
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
