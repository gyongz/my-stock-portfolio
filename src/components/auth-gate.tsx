'use client';

import LoginScreen from '@/components/login-screen';
import { useAuth } from '@/components/auth-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user } = useAuth();
  if (!configured) return children;
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">正在验证登录状态…</div>;
  }
  if (!user) return <LoginScreen />;
  return children;
}
