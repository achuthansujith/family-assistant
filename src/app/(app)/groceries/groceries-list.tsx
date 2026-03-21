"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

const CATEGORIES = ["produce","dairy","meat","bakery","frozen","snacks","beverages","household","personal_care","other"] as const;

export function GroceriesList({ initialItems, householdId, userId }: {
  initialItems: any[];
  householdId: string;
  userId: string;
}) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCat, setNewCat] = useState("other");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const unpurchased = items.filter(i => !i.purchased);
  const purchased = items.filter(i => i.purchased);

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
    }).select().single();
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setItems(prev => [data, ...prev]);
    setNewItem(""); setNewQty(""); setShowAdd(false);
    toast({ title: "Added to list", variant: "success" });
  }

  async function clearPurchased() {
    const ids = purchased.map(i => i.id);
    await supabase.from("grocery_items").delete().in("id", ids);
    setItems(prev => prev.filter(i => !i.purchased));
    toast({ title: "Cleared purchased items" });
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Item
      </Button>

      {showAdd && (
        <form onSubmit={addItem} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Input placeholder="Item name" value={newItem} onChange={e => setNewItem(e.target.value)} required />
          <div className="flex gap-2">
            <Input placeholder="Qty (optional)" value={newQty} onChange={e => setNewQty(e.target.value)} className="flex-1" />
            <select value={newCat} onChange={e => setNewCat(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">Add</Button>
        </form>
      )}

      {unpurchased.length === 0 && purchased.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Your list is empty</p>
      )}

      {unpurchased.length > 0 && (
        <div className="space-y-2">
          {unpurchased.map(item => (
            <Card key={item.id} className="flex items-center gap-3">
              <button onClick={() => togglePurchased(item)}>
                <Circle size={22} className="text-gray-300" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                {item.quantity && <p className="text-xs text-gray-400">{item.quantity}</p>}
              </div>
              <Badge variant="default">{item.category}</Badge>
              <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      )}

      {purchased.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-400">Purchased ({purchased.length})</p>
            <button onClick={clearPurchased} className="text-xs text-red-400">Clear all</button>
          </div>
          <div className="space-y-2 opacity-60">
            {purchased.map(item => (
              <Card key={item.id} className="flex items-center gap-3 py-2">
                <button onClick={() => togglePurchased(item)}>
                  <CheckCircle2 size={22} className="text-green-400" />
                </button>
                <p className="text-sm line-through text-gray-400 flex-1">{item.name}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
