import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";
import ThemeManager from "@/components/ThemeManager";
import PushManager from "@/components/PushManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Memory Guardian",
  description: "Your AI-powered personal memory assistant",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeManager />
        <PushManager />
        {children}
      </body>
    </html>
  );
}
