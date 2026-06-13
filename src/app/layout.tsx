import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin", "thai"] });

export const metadata: Metadata = {
  title: "Homework Tracker & Reconciliation",
  description: "ระบบติดตามและสอบทานการบ้านนักเรียน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full bg-white">
      <body className={`${inter.className} h-full overflow-x-hidden pb-20 sm:pb-0 bg-white text-gray-900`}>
        <Navigation />
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
