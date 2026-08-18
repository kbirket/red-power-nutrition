"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; is_available: boolean; is_seasonal: boolean };
type Addon = { id: string; name: string; price: number; is_available: boolean };
type Order = { id: string; created_at: string; total: number; status: string; fulfillment: string };
type OrderItem = { item_name: string; unit_price: number; quantity: number; order_id: string };
type Range = "today" | "7" | "30" | "all";

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;
const ranges: { key: Range; label: string }[] = [{ key: "today", label: "Today" }, { key: "7", label: "7 days" }, { key: "30", label: "30 days" }, { key: "all", label: "All time" }];

export default function OwnerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [range, setRange] = useState<Range>("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const s = createClient();
    const [categoryResult, itemResult, addonResult, orderResult, orderItemResult] = await Promise.all([
      s.from("menu_categories").select("id,name,sort_order").order("sort_order"),
      s.from("menu_items").select("id,category_id,name,description,price,is_available,is_seasonal").order("name"),
      s.from("addons").select("id,name,price,is_available").order("name"),
      s.from("orders").select("id,created_at,total,status,fulfillment").order("created_at", { ascending: false }),
      s.from("order_items").select("item_name,unit_price,quantity,order_id"),
    ]);
    const firstError = categoryResult.error || itemResult.error || addonResult.error || orderResult.error || orderItemResult.error;
    if (firstError) setError(firstError.message);
    else {
      setCategories(categoryResult.data || []);
      setItems((itemResult.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setAddons((addonResult.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setOrders((orderResult.data || []).map((x: any) => ({ ...x, total: Number(x.total) })));
      setOrderItems((orderItemResult.data || []).map((x: any) => ({ ...x, unit_price: Number(x.unit_price), quantity: Number(x.quantity) })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredOrders = useMemo(() => {
    if (range === "all") return orders;
    const now = new Date();
    const start = new Date(now);
    if (range === "today") start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - Number(range));
    return orders.filter((o) => new Date(o.created_at) >= start);
  }, [orders, range]);

  const filteredIds = useMemo(() => new Set(filteredOrders.map((o) => o.id)), [filteredOrders]);
  const analytics = useMemo(() => {
    const completed = filteredOrders.filter((o) => o.status === "completed");
    const revenue = completed.reduce((sum, o) => sum + o.total, 0);
    const average = completed.length ? revenue / completed.length : 0;
    const statusCounts = ["new", "making", "ready", "completed", "cancelled"].map((status) => ({ status, count: filteredOrders.filter((o) => o.status === status).length }));
    const fulfillment = ["pickup", "school_delivery"].map((name) => ({ name, count: filteredOrders.filter((o) => o.fulfillment === name).length }));
    const salesByDay = new Map<string, number>();
    completed.forEach((o) => { const day = new Date(o.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }); salesByDay.set(day, (salesByDay.get(day) || 0) + o.total); });
    const drinks = new Map<string, { quantity: number; revenue: number }>();
    orderItems.filter((x) => filteredIds.has(x.order_id)).forEach((x) => { const current = drinks.get(x.item_name) || { quantity: 0, revenue: 0 }; current.quantity += x.quantity; current.revenue += x.unit_price * x.quantity; drinks.set(x.item_name, current); });
    return { revenue, completed: completed.length, average, statusCounts, fulfillment, sales: Array.from(salesByDay, ([label, value]) => ({ label, value })), drinks: Array.from(drinks, ([name, value]) => ({ name, ...value })).sort((a, b) => b.quantity - a.quantity).slice(0, 8) };
  }, [filteredOrders, orderItems, filteredIds]);

  const saveItem = async (item: MenuItem) => {
    setSaving(true); setMessage(null); setError(null);
    const { error } = await createClient().from("menu_items").update({ category_id: item.category_id, name: item.name.trim(), description: item.description?.trim() || null, price: Number(item.price), is_available: item.is_available, is_seasonal: item.is_seasonal }).eq("id", item.id);
    setSaving(false); if (error) return setError(error.message); setMessage(`${item.name || "Drink"} saved.`);
  };
  const addItem = async () => {
    if (!categories.length) return setError("Add a category first."); setSaving(true); setMessage(null); setError(null);
    const { data, error } = await createClient().from("menu_items").insert({ category_id: categories[0].id, name: "New drink", description: null, price: 0, is_available: true, is_seasonal: false }).select("id,category_id,name,description,price,is_available,is_seasonal").single();
    setSaving(false); if (error) return setError(error.message); if (data) setItems((current) => [...current, { ...data, price: Number(data.price) }]); setMessage("New drink added. Edit it below and click Save.");
  };
  const deleteItem = async (id: string, name: string) => { if (!confirm(`Delete ${name}?`)) return; setSaving(true); const { error } = await createClient().from("menu_items").delete().eq("id", id); setSaving(false); if (error) return setError(error.message); setItems((current) => current.filter((x) => x.id !== id)); setMessage(`${name} deleted.`); };
  const saveAddon = async (addon: Addon) => { setSaving(true); const { error } = await createClient().from("addons").update({ name: addon.name.trim(), price: Number(addon.price), is_available: addon.is_available }).eq("id", addon.id); setSaving(false); if (error) return setError(error.message); setMessage(`${addon.name || "Boost"} saved.`); };
  const addAddon = async () => { setSaving(true); const { data, error } = await createClient().from("addons").insert({ name: "New boost", price: 0, is_available: true }).select("id,name,price,is_available").single(); setSaving(false); if (error) return setError(error.message); if (data) setAddons((current) => [...current, { ...data, price: Number(data.price) }]); setMessage("New boost added."); };
  const deleteAddon = async (id: string, name: string) => { if (!confirm(`Delete ${name}?`)) return; setSaving(true); const { error } = await createClient().from("addons").delete().eq("id", id); setSaving(false); if (error) return setError(error.message); setAddons((current) => current.filter((x) => x.id !== id)); setMessage(`${name} deleted.`); };
  const addCategory = async () => { const name = prompt("Category name:"); if (!name?.trim()) return; const { data, error } = await createClient().from("menu_categories").insert({ name: name.trim(), sort_order: categories.length + 1 }).select("id,name,sort_order").single(); if (error) return setError(error.message); if (data) setCategories((current) => [...current, data]); setMessage(`${name.trim()} category added.`); };
  const updateItem = (id: string, patch: Partial<MenuItem>) => setItems((current) => current.map((x) => x.id === id ? { ...x, ...patch } : x));
  const updateAddon = (id: string, patch: Partial<Addon>) => setAddons((current) => current.map((x) => x.id === id ? { ...x, ...patch } : x));
  const maxSales = Math.max(...analytics.sales.map((x) => x.value), 1);
  const maxDrink = Math.max(...analytics.drinks.map((x) => x.quantity), 1);

  return <main className="page">
    <div className="owner-header"><div><p className="eyebrow">OWNER DASHBOARD</p><h1>Red Power Control Center</h1><p>Track sales, see what customers are ordering, and manage your menu.</p></div><button onClick={load} disabled={loading}>↻ Refresh data</button></div>
    <div className="range-tabs">{ranges.map((r) => <button key={r.key} className={range === r.key ? "active" : ""} onClick={() => setRange(r.key)}>{r.label}</button>)}</div>
    {message && <p className="form-success">{message}</p>}{error && <p className="form-error">{error}</p>}

    <section className="metrics">
      <article><span>Revenue</span><strong>{money(analytics.revenue)}</strong><small>Completed orders</small></article>
      <article><span>Completed</span><strong>{analytics.completed}</strong><small>Orders finished</small></article>
      <article><span>Average order</span><strong>{money(analytics.average)}</strong><small>Per completed order</small></article>
      <article><span>Total orders</span><strong>{filteredOrders.length}</strong><small>All statuses</small></article>
    </section>

    <section className="analytics-grid">
      <article className="panel chart-card"><h2>Sales over time</h2><p className="muted">Completed order revenue</p>{analytics.sales.length ? <div className="bar-chart">{analytics.sales.map((x) => <div className="bar-col" key={x.label}><div className="bar" style={{ height: `${Math.max(8, x.value / maxSales * 180)}px` }} title={money(x.value)} /><small>{x.label}</small><b>{money(x.value)}</b></div>)}</div> : <p className="empty">No completed sales in this period yet.</p>}</article>
      <article className="panel"><h2>Order pipeline</h2>{analytics.statusCounts.map((x) => <div className="stat-row" key={x.status}><span>{x.status}</span><b>{x.count}</b></div>)}<h3>Fulfillment</h3>{analytics.fulfillment.map((x) => <div className="stat-row" key={x.name}><span>{x.name === "school_delivery" ? "School delivery" : "Pickup"}</span><b>{x.count}</b></div>)}</article>
      <article className="panel chart-card wide"><h2>Top drinks</h2><p className="muted">Based on quantity ordered</p>{analytics.drinks.length ? analytics.drinks.map((x) => <div className="drink-bar" key={x.name}><span>{x.name}</span><div><i style={{ width: `${x.quantity / maxDrink * 100}%` }} /></div><b>{x.quantity} · {money(x.revenue)}</b></div>) : <p className="empty">Drink details will appear as new orders are placed.</p>}</article>
    </section>

    <section className="panel recent"><div className="section-title"><h2>Recent orders</h2><span>{filteredOrders.length} shown</span></div>{filteredOrders.slice(0, 8).map((o) => <div className="recent-row" key={o.id}><div><b>{new Date(o.created_at).toLocaleString()}</b><small>{o.fulfillment === "school_delivery" ? "School delivery" : "Pickup"}</small></div><span className={`status ${o.status}`}>{o.status}</span><strong>{money(o.total)}</strong></div>)}{!filteredOrders.length && <p className="empty">No orders in this period.</p>}</section>

    <section className="panel"><div className="section-title"><div><h2>Menu Manager</h2><p className="muted">Changes update the ordering menu.</p></div><button className="submit-order" onClick={addItem} disabled={saving}>+ Add drink</button></div>{loading ? <p>Loading menu…</p> : items.map((item) => <div className="owner-row" key={item.id}><input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} placeholder="Drink name" /><input value={item.description || ""} onChange={(e) => updateItem(item.id, { description: e.target.value })} placeholder="Description" /><input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} /><select value={item.category_id || ""} onChange={(e) => updateItem(item.id, { category_id: e.target.value || null })}><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label><input type="checkbox" checked={item.is_available} onChange={(e) => updateItem(item.id, { is_available: e.target.checked })} /> Available</label><button onClick={() => saveItem(item)} disabled={saving}>Save</button><button onClick={() => deleteItem(item.id, item.name)} disabled={saving}>Delete</button></div>)}</section>

    <section className="panel"><div className="section-title"><h2>Boosts / Add-ons</h2><button className="submit-order" onClick={addAddon} disabled={saving}>+ Add boost</button></div>{addons.map((addon) => <div className="owner-row addon-row" key={addon.id}><input value={addon.name} onChange={(e) => updateAddon(addon.id, { name: e.target.value })} /><input type="number" min="0" step="0.01" value={addon.price} onChange={(e) => updateAddon(addon.id, { price: Number(e.target.value) })} /><span>{money(addon.price)}</span><label><input type="checkbox" checked={addon.is_available} onChange={(e) => updateAddon(addon.id, { is_available: e.target.checked })} /> Available</label><button onClick={() => saveAddon(addon)} disabled={saving}>Save</button><button onClick={() => deleteAddon(addon.id, addon.name)} disabled={saving}>Delete</button></div>)}</section>
    <section className="panel"><div className="section-title"><h2>Categories</h2><button onClick={addCategory}>+ Add category</button></div><p>{categories.map((x) => x.name).join(" • ") || "No categories yet."}</p></section>

    <style jsx>{`
      .owner-header,.section-title,.recent-row{display:flex;justify-content:space-between;align-items:center;gap:1rem}.range-tabs{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.25rem 0}.range-tabs button{padding:.6rem 1rem;border:1px solid #ddd;background:white;border-radius:999px}.range-tabs .active{background:#c62828;color:white;border-color:#c62828}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin:1rem 0}.metrics article{background:white;border:1px solid #e5e7eb;border-radius:1rem;padding:1.25rem}.metrics span,.metrics small,.muted,.recent-row small{display:block;color:#64748b}.metrics strong{display:block;font-size:1.8rem;margin:.35rem 0;color:#a3291f}.analytics-grid{display:grid;grid-template-columns:2fr 1fr;gap:1rem;margin-bottom:1rem}.analytics-grid .wide{grid-column:1/-1}.bar-chart{height:240px;display:flex;align-items:end;gap:.8rem;border-bottom:1px solid #ddd;padding:1rem 0}.bar-col{height:100%;flex:1;min-width:42px;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:.3rem}.bar{width:100%;background:linear-gradient(#e53935,#8f1d16);border-radius:.5rem .5rem 0 0}.bar-col small{font-size:.72rem}.bar-col b{font-size:.75rem}.stat-row{display:flex;justify-content:space-between;padding:.65rem 0;border-bottom:1px solid #eee;text-transform:capitalize}.drink-bar{display:grid;grid-template-columns:minmax(100px,1fr) 2fr auto;gap:.75rem;align-items:center;margin:.8rem 0}.drink-bar>div{height:12px;background:#eee;border-radius:999px;overflow:hidden}.drink-bar i{display:block;height:100%;background:#c62828;border-radius:999px}.recent{margin-bottom:1rem}.recent-row{padding:1rem 0;border-top:1px solid #eee}.recent-row strong{color:#a3291f}.status{padding:.3rem .6rem;border-radius:999px;background:#eee;text-transform:capitalize;font-size:.85rem}.status.completed{background:#dcfce7}.status.making{background:#fef3c7}.status.ready{background:#dbeafe}.owner-row{display:grid;grid-template-columns:1.2fr 1.5fr 100px 160px 110px auto auto;gap:.6rem;align-items:center;padding:1rem 0;border-top:1px solid #e5e7eb}.addon-row{grid-template-columns:1.5fr 120px 80px 110px auto auto}.owner-row input:not([type=checkbox]),.owner-row select{width:100%;padding:.7rem;border:1px solid #d1d5db;border-radius:.55rem}.owner-row button,.section-title button,.owner-header>button{padding:.65rem .9rem;border:0;border-radius:.55rem;cursor:pointer}.empty{color:#64748b;padding:1rem 0}@media(max-width:900px){.metrics{grid-template-columns:repeat(2,1fr)}.analytics-grid{grid-template-columns:1fr}.analytics-grid .wide{grid-column:auto}.owner-row,.addon-row{grid-template-columns:1fr 1fr}.recent-row{align-items:flex-start}.owner-header{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.metrics{grid-template-columns:1fr}.drink-bar{grid-template-columns:1fr}.bar-chart{overflow-x:auto}.bar-col{min-width:60px}}
    `}</style>
  </main>;
}
