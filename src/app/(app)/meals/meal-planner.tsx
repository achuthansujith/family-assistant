"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { format, addDays, parseISO } from "date-fns";
import { Plus, Trash2, ShoppingCart, ChefHat, Check, X } from "lucide-react";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES = ["produce","dairy","meat","bakery","frozen","snacks","beverages","household","personal_care","other"] as const;

type Plan = { id: string; plan_date: string; slot: string; meal_name: string; meal_id: string | null };
type Meal = { id: string; name: string; prep_minutes: number | null; tags: string[] };
type Ingredient = { name: string; quantity: string; category: string; include: boolean };

export function MealPlanner({ initialPlans, meals, householdId, userId, weekStart }: {
  initialPlans: Plan[];
  meals: Meal[];
  householdId: string;
  userId: string;
  weekStart: string;
}) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [adding, setAdding] = useState<{ date: string; slot: string } | null>(null);
  const [mealName, setMealName] = useState("");
  const [selectedMealId, setSelectedMealId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewMeal, setShowNewMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");

  // Grocery confirmation flow
  const [groceryFlow, setGroceryFlow] = useState<{
    plan: Plan;
    ingredients: Ingredient[];
    extra: string;
  } | null>(null);

  const { toast } = useToast();
  const supabase = createClient();

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), "yyyy-MM-dd")
  );

  function getPlansForSlot(date: string, slot: string) {
    return plans.filter(p => p.plan_date === date && p.slot === slot);
  }

  async function addPlan() {
    if (!adding) return;
    const name = selectedMealId
      ? meals.find(m => m.id === selectedMealId)?.name ?? mealName
      : mealName.trim();
    if (!name) return;
    setLoading(true);
    const { data, error } = await supabase.from("meal_plans").insert({
      household_id: householdId,
      created_by: userId,
      plan_date: adding.date,
      slot: adding.slot,
      meal_name: name,
      meal_id: selectedMealId || null,
    }).select().single();
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setPlans(prev => [...prev, data]);
    setAdding(null); setMealName(""); setSelectedMealId("");
    toast({ title: "Meal planned", variant: "success" });
  }

  async function removePlan(id: string) {
    await supabase.from("meal_plans").delete().eq("id", id);
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  async function createMeal() {
    if (!newMealName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("meals").insert({
      household_id: householdId,
      created_by: userId,
      name: newMealName.trim(),
    });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    toast({ title: "Meal saved", variant: "success" });
    setNewMealName(""); setShowNewMeal(false);
  }

  // Start grocery confirmation flow
  async function startGroceryFlow(plan: Plan) {
    let ingredients: Ingredient[] = [];

    if (plan.meal_id) {
      const { data } = await supabase
        .from("meal_ingredients").select("*").eq("meal_id", plan.meal_id);
      if (data?.length) {
        ingredients = data.map(i => ({
          name: i.name, quantity: i.quantity ?? "", category: i.category ?? "other", include: true,
        }));
      }
    }

    // If no structured ingredients, show empty editable list
    if (!ingredients.length) {
      ingredients = [{ name: "", quantity: "", category: "other", include: true }];
    }

    setGroceryFlow({ plan, ingredients, extra: "" });
  }

  function toggleIngredient(idx: number) {
    setGroceryFlow(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === idx ? { ...ing, include: !ing.include } : ing),
    } : null);
  }

  function updateIngredient(idx: number, field: keyof Ingredient, val: string) {
    setGroceryFlow(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: val } : ing),
    } : null);
  }

  function addIngredientRow() {
    setGroceryFlow(prev => prev ? {
      ...prev,
      ingredients: [...prev.ingredients, { name: "", quantity: "", category: "other", include: true }],
    } : null);
  }

  async function confirmGroceries() {
    if (!groceryFlow) return;
    setLoading(true);

    const toAdd = groceryFlow.ingredients.filter(i => i.include && i.name.trim());

    // Add extra item if typed
    if (groceryFlow.extra.trim()) {
      toAdd.push({ name: groceryFlow.extra.trim(), quantity: "", category: "other", include: true });
    }

    if (!toAdd.length) {
      setGroceryFlow(null);
      setLoading(false);
      return;
    }

    const rows = toAdd.map(i => ({
      household_id: householdId,
      added_by: userId,
      name: i.name,
      quantity: i.quantity || null,
      category: i.category,
      purchased: false,
    }));

    const { error } = await supabase.from("grocery_items").insert(rows);
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    toast({ title: `${rows.length} item${rows.length > 1 ? "s" : ""} added to grocery list`, variant: "success" });
    setGroceryFlow(null);
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      {/* Grocery confirmation modal */}
      {groceryFlow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add groceries for {groceryFlow.plan.meal_name}?</h3>
              <button onClick={() => setGroceryFlow(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-2">
              {groceryFlow.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button onClick={() => toggleIngredient(idx)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      ing.include ? "bg-brand-500 border-brand-500" : "border-gray-300"
                    }`}>
                    {ing.include && <Check size={12} className="text-white" />}
                  </button>
                  <input value={ing.name} onChange={e => updateIngredient(idx, "name", e.target.value)}
                    placeholder="Item name"
                    className="flex-1 text-sm border border-brand-100 bg-brand-50 rounded-xl px-3 py-2 min-w-0 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <input value={ing.quantity} onChange={e => updateIngredient(idx, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-16 text-sm border border-brand-100 bg-brand-50 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              ))}
              <button onClick={addIngredientRow}
                className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-1">
                <Plus size={12} /> Add item
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-600 font-medium">Anything extra to add?</label>
              <input value={groceryFlow.extra} onChange={e => setGroceryFlow(prev => prev ? { ...prev, extra: e.target.value } : null)}
                placeholder="e.g. olive oil"
                className="mt-1 w-full text-sm border border-brand-100 bg-brand-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={confirmGroceries} loading={loading} className="flex-1">
                <ShoppingCart size={15} /> Add to grocery list
              </Button>
              <Button variant="ghost" onClick={() => setGroceryFlow(null)}>Skip</Button>
            </div>
          </div>
        </div>
      )}

      {/* New meal template */}
      <Button size="sm" variant="secondary" className="w-full" onClick={() => setShowNewMeal(s => !s)}>
        <ChefHat size={14} /> Save meal template
      </Button>

      {showNewMeal && (
        <Card className="space-y-3">
          <Input label="Meal name" value={newMealName} onChange={e => setNewMealName(e.target.value)} placeholder="e.g. Pasta Bolognese" />
          <Button size="sm" loading={loading} onClick={createMeal} className="w-full">Save</Button>
        </Card>
      )}

      {/* Weekly grid */}
      <div className="space-y-3">
        {weekDates.map((date, di) => (
          <div key={date} className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
            <div className="px-4 py-2 bg-brand-50 border-b border-brand-100">
              <span className="text-sm font-semibold text-brand-700">{DAYS[di]} {format(parseISO(date), "d MMM")}</span>
            </div>
            <div className="divide-y divide-brand-50">
              {SLOTS.map(slot => {
                const slotPlans = getPlansForSlot(date, slot);
                const isAdding = adding?.date === date && adding?.slot === slot;
                return (
                  <div key={slot} className="px-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-brand-400 capitalize">{slot}</span>
                      <button onClick={() => { setAdding({ date, slot }); setMealName(""); setSelectedMealId(""); }}
                        className="text-xs text-brand-500 hover:text-brand-600">+ add</button>
                    </div>
                    {slotPlans.map(p => (
                      <div key={p.id} className="flex items-center gap-2 py-0.5">
                        <span className="text-sm flex-1">{p.meal_name}</span>
                        <button onClick={() => startGroceryFlow(p)}
                          className="text-gray-300 hover:text-green-500" title="Add to groceries">
                          <ShoppingCart size={13} />
                        </button>
                        <button onClick={() => removePlan(p.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {isAdding && (
                      <div className="mt-2 space-y-2">
                        {meals.length > 0 && (
                          <select value={selectedMealId} onChange={e => setSelectedMealId(e.target.value)}
                            className="w-full text-sm rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400">
                            <option value="">-- pick saved meal --</option>
                            {meals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        )}
                        {!selectedMealId && (
                          <Input placeholder="Or type meal name" value={mealName}
                            onChange={e => setMealName(e.target.value)} />
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" loading={loading} onClick={addPlan} className="flex-1">Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}