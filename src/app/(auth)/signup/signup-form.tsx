"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3;
}

const strengthColors = ["bg-gray-200", "bg-red-400", "bg-yellow-400", "bg-green-400"];
const strengthLabels = ["", "Weak", "Fair", "Strong"];

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const { data, error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    });
    if (signupError) { setError(signupError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, email, display_name: name });
    }
    setLoading(false);
    router.push("/onboarding");
  }

  const inputClass = cn(
    "w-full rounded-xl border border-brand-100 bg-brand-50 px-3 py-3 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent",
    "placeholder:text-brand-300"
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-brand-100 p-6 space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-brand-700">Your name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Alex"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-brand-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-brand-700">Password</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            className={cn(inputClass, "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3].map(level => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    strength >= level ? strengthColors[strength] : "bg-gray-200"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-brand-500">{strengthLabels[strength]}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

      <Button type="submit" loading={loading} className="w-full" size="lg">Create Account</Button>

      <p className="text-center text-sm text-brand-500">
        Have an account? <Link href="/login" className="text-brand-600 font-semibold">Sign in</Link>
      </p>
    </form>
  );
}
