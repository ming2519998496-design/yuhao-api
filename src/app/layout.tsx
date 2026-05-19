import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "遇好API — 企业级 AI 模型接入平台",
  description:
    "统一接入 GPT、Claude、Gemini 等主流大模型。低延迟、高可用、OpenAI 兼容接口，助力产品快速智能化。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
