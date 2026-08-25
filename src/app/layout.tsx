import type { Metadata } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import AppLayout from "@/components/AppLayout";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-thai",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="th" className={`h-full bg-[#f4f7fa] ${notoSansThai.variable} ${inter.variable}`}>
      <body className="font-sans h-full overflow-x-hidden pb-20 md:pb-0 bg-[#f4f7fa] text-black antialiased">
        <AuthWrapper>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthWrapper>
      </body>
    </html>
  );
}
