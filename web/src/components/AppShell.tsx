"use client";

import { Suspense, useEffect, useState } from "react";
import { applyAccent } from "@/lib/accent";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Loader } from "./Loader";
import { Tour } from "./Tour";
import { BottomNav } from "./BottomNav";

/**
 * Everything behind the login: checks the user is signed in, centres the
 * column, and shows the bottom navigation. The nav reads the URL, so it sits in
 * its own Suspense boundary (the rest of the page can still be prerendered).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, error, isPending } = useRequireAuth();
  const accent = data?.accent;
  // a new account sees the tour once; the account remembers it, so other devices do not repeat it
  const needsTour = !!data && data.onboardedAt === null;
  const [tourDismissed, setTourDismissed] = useState(false);

  // the accent follows the account, so it is the same on every device
  useEffect(() => {
    if (accent) applyAccent(accent);
  }, [accent]);

  if (isPending || error) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader size={64} />
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pb-32 pt-6">
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <Tour open={needsTour && !tourDismissed} onClose={() => setTourDismissed(true)} markDone />
    </>
  );
}
