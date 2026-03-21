"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { CheckCircle2, Circle, Plus, Trash2, Zap } from "lucide-react";

const CATEGORIES = ["produce","dairy","meat","bakery","frozen","snacks","beverages","household","personal_care","other"] as const;
const CAT_EMOJI: Record<string, string> = {
  produce:"", dairy:"", meat:"", bakery:"", frozen:"",
  snacks:"", beverages:"", household:"", personal_care:"", other:"",
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

  // Group by category
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
    toast({ title: "Added", variant: "success" });
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
  }

  const GroceryRow = ({ item }: { item: any }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <button onClick={() => togglePurchased(item)}>
        {item.purchased
          ? <CheckCircle2 size={22} className="text-green-400" />
          : <Circle size={22} className="text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.purchased ? "line-through text-gray-400" : ""}`}>{item.name}</p>
        {item.quantity && <p className="text-xs text-gray-400">{item.quantity}</p>}
      </div>
      {item.need_soon && !item.purchased && (
        <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-medium">soon</span>
      )}
      <button onClick={() => deleteItem(item.id)} className="text-gray-200 hover:text-red-400 p-1">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Item
      </Button>

      {showAdd && (
        <form onSubmit={addItem} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Input placeholder="Item name" value={newItem} onChange={e => setNewItem(e.target.value)} required />
          <div className="flex gap-2">
            <Input placeholder="Qty" value={newQty} onChange={e => setNewQty(e.target.value)} className="w-24" />
            <select value={newCat} onChange={e => setNewCat(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={needSoon} onChange={e => setNeedSoon(e.target.checked)} className="rounded" />
            Need soon
          </label>
          <Button type="submit" loading={loading} className="w-full">Add</Button>
        </form>
      )}

      {/* Template chips */}
      {initialTemplates.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Zap size={11} /> Quick add</p>
          <div className="flex flex-wrap gap-2">
            {initialTemplates.map(tpl => (
              <button key={tpl.id} onClick={() => addFromTemplate(tpl)}
                className="text-xs bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-gray-600 px-3 py-1.5 rounded-full transition-colors">
                + {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Your list is empty</p>}

      {/* Need soon section */}
      {needSoonItems.length > 0 && (
        <Card className="border-red-100">
          <p className="text-xs font-semibold text-red-500 mb-1">Need soon</p>
          {needSoonItems.map(item => <GroceryRow key={item.id} item={item} />)}
        </Card>
      )}

      {/* Grouped by category */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="text-xs font-medium text-gray-400 mb-1">{CAT_EMOJI[cat]} {cat}</p>
          <Card>
            {catItems.map(item => <GroceryRow key={item.id} item={item} />)}
          </Card>
        </div>
      ))}

      {/* Purchased */}
      {purchased.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Purchased ({purchased.length})</p>
            <button onClick={clearPurchased} className="text-xs text-red-400">Clear</button>
          </div>
          <Card className="opacity-60">
            {purchased.map(item => <GroceryRow key={item.id} item={item} />)}
          </Card>
        </div>
      )}
    </div>
  );
}