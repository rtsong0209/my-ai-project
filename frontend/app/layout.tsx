import type { Metadata } from "next";
// 1. 引入字体
import { Noto_Sans_SC, Roboto_Mono } from "next/font/google"; 
import "./globals.css";

// 2. 配置主字体 (黑体 - 用于 UI 和正文)
const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"], // 包含基础拉丁字符
  weight: ["400", "500", "700"], // 下载常规、中等、粗体
  variable: "--font-sans", // 定义 CSS 变量名
  display: "swap",
});

// 3. 配置代码字体 (用于代码块，可选)
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI 素材库",
  description: "智能作文素材管理助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      {/* 4. 将字体变量注入 body，并设置默认字体为 sans */}
      <body className={`${notoSansSC.variable} ${robotoMono.variable} font-sans antialiased bg-[#f3f4f6]`}>
        {children}
      </body>
    </html>
  );
}