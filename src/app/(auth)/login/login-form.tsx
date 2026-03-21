"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">Sign In</Button>
      <p className="text-center text-sm text-gray-500">
        No account? <Link href="/signup" className="text-brand-600 font-medium">Sign up</Link>
      </p>
    </form>
  );
}
