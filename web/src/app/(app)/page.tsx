import { TodayView } from "@/components/TodayView";

// Everything behind the login depends on the signed-in user: the token lives in the
// browser, so the server cannot render any of this page's content ahead of time.
// AppShell shows "Loading..." until the sign-in check finishes. Instant-navigation
// validation can't apply to that, so this page is declared allowed to block.
export const instant = false

export default function TodayPage() {
  return <TodayView />;
}
