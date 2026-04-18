"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toaster";
import { CheckCircle2, Circle, Plus, Trash2, Zap, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["produce","dairy","meat","bakery","frozen","snacks","beverages","household","personal_care","other"] as const;
const CAT_EMOJI: Record<string, string> = {
  produce:"🥦", dairy:"🥛", meat:"🥩", bakery:"🍞", frozen:"🧊",
  snacks:"🍿", beverages:"🧃", household:"🧹", personal_care:"🧴", other:"🛒",
};

export function GroceriesList({ initialItems, initialTemplates, householdId, userId }: {
  initialItems: any[];
  initialTemplates: any[];
  householdId: string;
  userId: string;
}) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCat, setNewCat] = useState("other");
  const [needSoon, setNeedSoon] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const unpurchased = items.filter(i => !i.purchased);
  const purchased = items.filter(i => i.purchased);
  const needSoonItems = unpurchased.filter(i => i.need_soon);
  const laterItems = unpurchased.filter(i => !i.need_soon);

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = laterItems.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, any[]>);

  async function togglePurchased(item: any) {
    const newVal = !item.purchased;
    await supabase.from("grocery_items").update({
      purchased: newVal,
      purchased_by: newVal ? userId : null,
      purchased_at: newVal ? new Date().toISOString() : null,
    }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, purchased: newVal } : i));
  }

  async function deleteItem(id: string) {
    await supabase.from("grocery_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("grocery_items").insert({
      household_id: householdId,
      name: newItem.trim(),
      quantity: newQty.trim() || null,
      category: newCat,
      added_by: userId,
      need_soon: needSoon,
    }).select().single();
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setItems(prev => [data, ...prev]);
    setNewItem(""); setNewQty(""); setNeedSoon(false); setShowAdd(false);
    toast({ title: "Added to list", variant: "success" });
  }

  async function addFromTemplate(tpl: any) {
    const { data, error } = await supabase.from("grocery_items").insert({
      household_id: householdId,
      name: tpl.name,
      quantity: tpl.quantity,
      category: tpl.category,
      added_by: userId,
      from_template_id: tpl.id,
    }).select().single();
    if (!error && data) setItems(prev => [data, ...prev]);
  }

  async function clearPurchased() {
    const ids = purchased.map(i => i.id);
    await supabase.from("grocery_items").delete().in("id", ids);
    setItems(prev => prev.filter(i => !i.purchased));
    toast({ title: `Cleared ${ids.length} items`, variant: "success" });
  }

  function shareList() {
    const lines = unpurchased.map(i => `• ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join("\n");
    navigator.clipboard.writeText(`Shopping list:\n${lines}`);
    toast({ title: "List copied to clipboard!" });
  }

  const inputClass = cn(
    "w-full rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-brand-300"
  );

  const GroceryRow = ({ item }: { item: any }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-brand-50 last:border-0">
      <button onClick={() => togglePurchased(item)} className="min-w-[36px] min-h-[36px] flex items-center justify-center">
        {item.purchased
          ? <CheckCircle2 size={22} className="text-green-400" />
          : <Circle size={22} className="text-brand-200" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.purchased ? "line-through text-brand-300" : "text-brand-800"}`}>{item.name}</p>
        {item.quantity && <p className="text-xs text-brand-400">{item.quantity}</p>}
      </div>
      {item.need_soon && !item.purchased && (
        <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-medium border border-red-100">soon</span>
      )}
      <button onClick={() => deleteItem(item.id)} className="text-brand-100 hover:text-red-400 p-1">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <div className="flex gap-2">
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="flex-1">
          <Plus size={16} /> Add Item
        </Button>
        {unpurchased.length > 0 && (
          <Button onClick={shareList} size="sm" variant="secondary">
            <Share2 size={15} />
          </Button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={addItem} className="bg-white rounded-2xl border border-brand-100 p-4 space-y-3">
          <input
            placeholder="Item name"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            autoFocus
            className={inputClass}
            required
          />
          <div className="flex gap-2">
            <input
              placeholder="Qty"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              className={cn(inputClass, "w-24")}
            />
            <select value={newCat} onChange={e => setNewCat(e.target.value)} className={cn(inputClass, "flex-1")}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-600 cursor-pointer">
            <input type="checkbox" checked={needSoon} onChange={e => setNeedSoon(e.target.checked)} className="rounded" />
            Need soon (urgent)
          </label>
          <Button type="submit" loading={loading} className="w-full">Add</Button>
        </form>
      )}

      {/* Template chips */}
      {initialTemplates.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2 flex items-center gap-1">
            <Zap size={11} /> Quick add
          </p>
          <div className="flex flex-wrap gap-2">
            {initialTemplates.map(tpl => (
              <button key={tpl.id} onClick={() => addFromTemplate(tpl)}
                className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-1.5 rounded-full border border-brand-100 transition-colors">
                + {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <EmptyState emoji="🛒" title="List is empty" description="Add items to your grocery list" />
      )}

      {/* Need soon section */}
      {needSoonItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-2">Need soon</p>
          <Card className="border-red-100 p-0 overflow-hidden">
            <div className="px-4">
              {needSoonItems.map(item => <GroceryRow key={item.id} item={item} />)}
            </div>
          </Card>
        </div>
      )}

      {/* Grouped by category */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500 mb-2">
            {CAT_EMOJI[cat]} {cat}
          </p>
          <Card className="p-0 overflow-hidden">
            <div className="px-4">
              {catItems.map(item => <GroceryRow key={item.id} item={item} />)}
            </div>
          </Card>
        </div>
      ))}

      {/* Purchased */}
      {purchased.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">
              Purchased ({purchased.length})
            </p>
            <button onClick={clearPurchased} className="text-xs text-red-400 font-medium hover:text-red-600">
              Clear checked
            </button>
          </div>
          <Card className="p-0 overflow-hidden opacity-60">
            <div className="px-4">
              {purchased.map(item => <GroceryRow key={item.id} item={item} />)}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
