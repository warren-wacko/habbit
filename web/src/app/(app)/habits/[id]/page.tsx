import { Suspense } from "react";
import { HabitDetailView } from "@/components/HabitDetailView";

// Everything behind the login depends on the signed-in user: the token lives in the
// browser, so the server cannot render any of this page's content ahead of time.
// AppShell shows a loading animation until the sign-in check finishes. Instant-navigation
// validation can't apply to that, so this page is declared allowed to block.
export const instant = false

// The habit id is only known per request, so the part that reads it sits in Suspense
export default function HabitPage() {
  return (
    <Suspense
      fallback={<div className="skeleton h-14" aria-busy="true" aria-label="Loading habit" />}
    >
      <HabitDetailView />
    </Suspense>
  );
}
