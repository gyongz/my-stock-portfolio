'use client';

import { FormEvent, useState } from 'react';
import { ChartCandlestick, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError('邮箱或密码不正确');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-sm rounded-3xl border border-border/70 bg-card/80 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#30d158]/15 text-[#30d158]">
            <ChartCandlestick className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">个人持仓</h1>
            <p className="text-xs text-muted-foreground">登录后访问你的私有投资数据</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full bg-[#30d158] text-white hover:bg-[#30d158]/90">
            {submitting ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}
            {submitting ? '正在登录' : '安全登录'}
          </Button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
          账户由管理员在 Supabase 中创建，本页面不开放注册。
        </p>
      </section>
    </main>
  );
}
