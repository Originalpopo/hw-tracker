import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import AppLayout from "@/components/AppLayout";

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
        <AuthWrapper>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthWrapper>
      </body>
    </html>
  );
}
