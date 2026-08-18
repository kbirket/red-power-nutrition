"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  is_seasonal: boolean;
};
type Addon = { id: string; name: string; price: number; is_available: boolean };

const money = (value: number) => `$${Number(value).toFixed(2)}`;

export default function OwnerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const s = createClient();
    const [categoryResult, itemResult, addonResult] = await Promise.all([
      s.from("menu_categories").select("id,name,sort_order").order("sort_order"),
      s.from("menu_items").select("id,category_id,name,description,price,is_available,is_seasonal").order("name"),
      s.from("addons").select("id,name,price,is_available").order("name"),
    ]);
    if (categoryResult.error || itemResult.error || addonResult.error) {
      setError(categoryResult.error?.message || itemResult.error?.message || addonResult.error?.message || "Unable to load menu.");
    } else {
      setCategories(categoryResult.data || []);
      setItems((itemResult.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setAddons((addonResult.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveItem = async (item: MenuItem) => {
    setSaving(true); setMessage(null); setError(null);
    const { error } = await createClient().from("menu_items").update({
      category_id: item.category_id,
      name: item.name.trim(),
      description: item.description?.trim() || null,
      price: Number(item.price),
      is_available: item.is_available,
      is_seasonal: item.is_seasonal,
    }).eq("id", item.id);
    setSaving(false);
    if (error) return setError(error.message);
    setMessage(`${item.name || "Drink"} saved.`);
  };

  const addItem = async () => {
    if (!categories.length) return setError("Add a category first.");
    setSaving(true); setMessage(null); setError(null);
    const { data, error } = await createClient().from("menu_items").insert({
      category_id: categories[0].id,
      name: "New drink",
      description: null,
      price: 0,
      is_available: true,
      is_seasonal: false,
    }).select("id,category_id,name,description,price,is_available,is_seasonal").single();
    setSaving(false);
    if (error) return setError(error.message);
    if (data) setItems((current) => [...current, { ...data, price: Number(data.price) }]);
    setMessage("New drink added. Edit it below and click Save.");
  };

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    setSaving(true); setMessage(null); setError(null);
    const { error } = await createClient().from("menu_items").delete().eq("id", id);
    setSaving(false);
    if (error) return setError(error.message);
    setItems((current) => current.filter((x) => x.id !== id));
    setMessage(`${name} deleted.`);
  };

  const saveAddon = async (addon: Addon) => {
    setSaving(true); setMessage(null); setError(null);
    const { error } = await createClient().from("addons").update({ name: addon.name.trim(), price: Number(addon.price), is_available: addon.is_available }).eq("id", addon.id);
    setSaving(false);
    if (error) return setError(error.message);
    setMessage(`${addon.name || "Boost"} saved.`);
  };

  const addAddon = async () => {
    setSaving(true); setMessage(null); setError(null);
    const { data, error } = await createClient().from("addons").insert({ name: "New boost", price: 0, is_available: true }).select("id,name,price,is_available").single();
    setSaving(false);
    if (error) return setError(error.message);
    if (data) setAddons((current) => [...current, { ...data, price: Number(data.price) }]);
    setMessage("New boost added.");
  };

  const deleteAddon = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    setSaving(true); setMessage(null); setError(null);
    const { error } = await createClient().from("addons").delete().eq("id", id);
    setSaving(false);
    if (error) return setError(error.message);
    setAddons((current) => current.filter((x) => x.id !== id));
    setMessage(`${name} deleted.`);
  };

  const addCategory = async () => {
    const name = prompt("Category name:");
    if (!name?.trim()) return;
    const { data, error } = await createClient().from("menu_categories").insert({ name: name.trim(), sort_order: categories.length + 1 }).select("id,name,sort_order").single();
    if (error) return setError(error.message);
    if (data) setCategories((current) => [...current, data]);
    setMessage(`${name.trim()} category added.`);
  };

  const updateItem = (id: string, patch: Partial<MenuItem>) => setItems((current) => current.map((x) => x.id === id ? { ...x, ...patch } : x));
  const updateAddon = (id: string, patch: Partial<Addon>) => setAddons((current) => current.map((x) => x.id === id ? { ...x, ...patch } : x));

  return (
    <main className="page">
      <p className="eyebrow">OWNER</p>
      <h1>Menu Manager</h1>
      <p>Change drinks, descriptions, prices, categories, and availability. Changes appear on the ordering page after it refreshes.</p>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        <div className="section-title"><h2>Drinks</h2><button className="submit-order" onClick={addItem} disabled={saving}>+ Add drink</button></div>
        {loading ? <p>Loading menu…</p> : items.map((item) => (
          <div className="owner-row" key={item.id}>
            <input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} placeholder="Drink name" />
            <input value={item.description || ""} onChange={(e) => updateItem(item.id, { description: e.target.value })} placeholder="Description" />
            <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} aria-label={`${item.name} price`} />
            <select value={item.category_id || ""} onChange={(e) => updateItem(item.id, { category_id: e.target.value || null })}>
              <option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label><input type="checkbox" checked={item.is_available} onChange={(e) => updateItem(item.id, { is_available: e.target.checked })} /> Available</label>
            <button onClick={() => saveItem(item)} disabled={saving}>Save</button>
            <button onClick={() => deleteItem(item.id, item.name)} disabled={saving}>Delete</button>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="section-title"><h2>Boosts / Add-ons</h2><button className="submit-order" onClick={addAddon} disabled={saving}>+ Add boost</button></div>
        {addons.map((addon) => (
          <div className="owner-row" key={addon.id}>
            <input value={addon.name} onChange={(e) => updateAddon(addon.id, { name: e.target.value })} placeholder="Boost name" />
            <input type="number" min="0" step="0.01" value={addon.price} onChange={(e) => updateAddon(addon.id, { price: Number(e.target.value) })} aria-label={`${addon.name} price`} />
            <span>{money(addon.price)}</span>
            <label><input type="checkbox" checked={addon.is_available} onChange={(e) => updateAddon(addon.id, { is_available: e.target.checked })} /> Available</label>
            <button onClick={() => saveAddon(addon)} disabled={saving}>Save</button>
            <button onClick={() => deleteAddon(addon.id, addon.name)} disabled={saving}>Delete</button>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="section-title"><h2>Categories</h2><button onClick={addCategory}>+ Add category</button></div>
        <p>{categories.map((x) => x.name).join(" • ") || "No categories yet."}</p>
      </section>

      <style jsx>{`
        .section-title { display:flex; justify-content:space-between; align-items:center; gap:1rem; }
        .owner-row { display:grid; grid-template-columns:1.2fr 1.5fr 100px 160px 110px auto auto; gap:.6rem; align-items:center; padding:1rem 0; border-top:1px solid #e5e7eb; }
        .owner-row input:not([type=checkbox]), .owner-row select { width:100%; padding:.7rem; border:1px solid #d1d5db; border-radius:.55rem; }
        .owner-row button, .section-title button { padding:.65rem .9rem; border:0; border-radius:.55rem; cursor:pointer; }
        @media (max-width:900px) { .owner-row { grid-template-columns:1fr 1fr; } }
      `}</style>
    </main>
  );
}
