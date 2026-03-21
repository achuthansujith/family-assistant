"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    });
    if (signupError) { setError(signupError.message); setLoading(false); return; }
    // Create profile
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id, email, display_name: name,
      });
    }
    setLoading(false);
    router.push("/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
      <Input label="Your name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Alex" />
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">Create Account</Button>
      <p className="text-center text-sm text-gray-500">
        Have an account? <Link href="/login" className="text-brand-600 font-medium">Sign in</Link>
      </p>
    </form>
  );
}
