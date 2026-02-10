import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sales Tracking App",
  description: "Track team attainment and pace by month."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <h1>Sales Tracking</h1>
          <p className="muted">Live monthly attainment for Expansion and New Logo teams.</p>
          <nav className="nav">
            <Link href="/">Dashboard</Link>
            <Link href="/update">Update</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
