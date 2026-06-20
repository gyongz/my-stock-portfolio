import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: '个人持仓管理系统 | Portfolio',
  description: '基于 KLineChart 的个人持仓管理 Web 应用，支持实时行情、技术分析、持仓管理等功能',
  keywords: ['持仓管理', 'KLineChart', '股票图表', '投资组合', '技术分析'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased bg-background text-foreground font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
