import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} h-full overflow-x-hidden pb-20 md:pb-0 bg-white text-gray-900`}>
        <Navigation />
        <div className="md:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
