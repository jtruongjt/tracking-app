import type { Metadata } from "next";
import "./globals.css";
import { isDailyActivityEnabled } from "@/lib/features";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppNav } from "@/components/app-nav";

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
          <header className="card app-header">
            <div>
              <h1>Sales Tracking</h1>
              <p className="muted">Live monthly attainment and daily activity for Expansion and New Logo teams.</p>
            </div>
            <div className="header-actions">
              <ThemeToggle />
            </div>
            <div className="header-nav">
              <AppNav dailyActivityEnabled={dailyActivityEnabled} />
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
