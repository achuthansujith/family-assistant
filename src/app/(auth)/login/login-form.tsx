"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password) { setError("Password is required"); return; }
    setLoading(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-brand-100 p-6 space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-brand-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
          placeholder="you@example.com"
          className={cn(
            "w-full rounded-xl border border-brand-100 bg-brand-50 px-3 py-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent",
            "placeholder:text-brand-300"
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-brand-700">Password</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(
              "w-full rounded-xl border border-brand-100 bg-brand-50 px-3 py-3 pr-10 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent",
              "placeholder:text-brand-300"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

      <Button type="submit" loading={loading} className="w-full" size="lg">Sign In</Button>

      <p className="text-center text-sm text-brand-500">
        No account? <Link href="/signup" className="text-brand-600 font-semibold">Sign up</Link>
      </p>
    </form>
  );
}
