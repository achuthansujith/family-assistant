import { vi } from "vitest";

/** Returns a fully-chainable Supabase query builder that resolves to `result`. */
export function chainable(result: unknown) {
  const obj: Record<string, unknown> = {};
  const chain = () => obj;
  const resolve = () => Promise.resolve(result);

  obj.select = chain;
  obj.eq = chain;
  obj.neq = chain;
  obj.order = chain;
  obj.limit = chain;
  obj.lte = chain;
  obj.gte = chain;
  obj.lt = chain;
  obj.gt = chain;
  obj.single = resolve;
  obj.upsert = resolve;
  obj.insert = resolve;
  obj.delete = chain;
  obj.update = chain;
  // Make the chain itself awaitable (for patterns like `await supabase.from().select().eq()`)
  obj.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);

  return obj;
}

export const PERSON_A = { id: "user-a", email: "a@test.com" };
export const PERSON_B = { id: "user-b", email: "b@test.com" };
export const HOUSEHOLD_ID = "household-1";

export const SUB_A = { endpoint: "https://fcm.example/a", p256dh: "pk-a", auth: "auth-a" };
export const SUB_B = { endpoint: "https://fcm.example/b", p256dh: "pk-b", auth: "auth-b" };

export function makeSupabaseMock(opts: {
  user?: { id: string } | null;
  fromResult?: unknown;
}) {
  const getUser = vi.fn().mockResolvedValue({ data: { user: opts.user ?? null } });
  const from = vi.fn().mockReturnValue(chainable(opts.fromResult ?? { data: null, error: null }));

  const client = { auth: { getUser }, from };
  return { client, getUser, from };
}