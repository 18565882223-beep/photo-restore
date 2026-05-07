import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "老照片 AI 修复",
  description: "上传老照片，AI 自动修复划痕、噪点、破损，优化人像细节",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
