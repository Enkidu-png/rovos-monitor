import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rovos Monitor",
  description: "Monitoring https://rovos.com/journeys/specials/ - wykrywanie zmian ofert Rovos Rail",
  openGraph: {
    title: "Rovos Monitor",
    description: "Monitoring https://rovos.com/journeys/specials/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
