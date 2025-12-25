import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 🌟 扩展字体配置
      fontFamily: {
        // 默认 sans 字体：优先用 Google 字体，加载失败则回退到系统字体
        sans: [
          "var(--font-sans)", 
          "PingFang SC", 
          "Microsoft YaHei", 
          "ui-sans-serif", 
          "system-ui", 
          "sans-serif"
        ],
        // 代码字体
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      // 保留原本的背景渐变配置 (Next.js 默认自带的)
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    // 🌟 务必加上这个插件，否则详情页的 Markdown 文章没有排版样式
    require('@tailwindcss/typography'),
  ],
};
export default config;