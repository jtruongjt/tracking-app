import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { isDailyActivityEnabled } from "@/lib/features";

export const metadata: Metadata = {
  title: "Sales Tracking App",
  description: "Track monthly attainment and daily rep activity."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dailyActivityEnabled = isDailyActivityEnabled();

  return (
    <html lang="en">
      <body>
        <main className="container">
          <h1>Sales Tracking</h1>
          <p className="muted">Live monthly attainment and daily activity for Expansion and New Logo teams.</p>
          <nav className="nav">
            <Link href="/">Performance Dashboard</Link>
            <Link href="/update">Update Performance</Link>
            {dailyActivityEnabled ? <Link href="/activity">Activity Dashboard</Link> : null}
            {dailyActivityEnabled ? <Link href="/activity/update">Update Activity</Link> : null}
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
