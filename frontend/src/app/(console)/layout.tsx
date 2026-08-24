import { Shell } from "@/components/shell";

// Route group layout: all console pages share the sidebar shell.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
