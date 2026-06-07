import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Talenti a Casa — Managementdashboard",
  description:
    "Inzicht in trajecten, kosten en prestaties voor jeugd-GGZ-aanbieder Talenti a Casa.",
  icons: { icon: "/logo-talenti.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${nunito.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
