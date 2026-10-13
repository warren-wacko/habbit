import { AppShell } from "@/components/AppShell";

// Every page behind the login shares this: the auth check and the bottom navigation
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
