"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab = "dashboard" | "menu" | "prices" | "addons" | "orders";
type Category = { id: string; name: string; sort_order: number };
type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  is_seasonal: boolean;
  available_from: string | null;
  available_until: string | null;
};
type Addon = { id: string; name: string; price: number; is_available: boolean };
type Order = { id: string; created_at: string; total: number; status: string; fulfillment: string };
type OrderItem = { item_name: string; quantity: number };

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const dateOnly = (v: string | null) => v ? v.slice(0, 10) : "";

export default function OwnerPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const s = createClient();
    const [c, i, a, o, oi] = await Promise.all([
      s.from("menu_categories").select("id,name,sort_order").order("sort_order"),
      s.from("menu_items").select("id,category_id,name,description,price,is_available,is_seasonal,available_from,available_until").order("name"),
      s.from("addons").select("id,name,price,is_available").order("name"),
      s.from("orders").select("id,created_at,total,status,fulfillment").order("created_at", { ascending: false }),
      s.from("order_items").select("item_name,quantity"),
    ]);
    const first = c.error || i.error || a.error || o.error || oi.error;
    if (first) setError(first.message);
    else {
      setCategories(c.data || []);
      setItems((i.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setAddons((a.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setOrders((o.data || []).map((x: any) => ({ ...x, total: Number(x.total) })));
      setOrderItems((oi.data || []).map((x: any) => ({ ...x, quantity: Number(x.quantity) || 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const updateItem = (id: string, patch: Partial<MenuItem>) => setItems(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));
  const updateAddon = (id: string, patch: Partial<Addon>) => setAddons(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));

  const saveItem = async (x: MenuItem) => {
    setSaving(true); setMessage(""); setError("");
    const { error } = await createClient().from("menu_items").update({
      category_id: x.category_id,
      name: x.name.trim(),
      description: x.description?.trim() || null,
      price: Number(x.price),
      is_available: x.is_available,
      is_seasonal: x.is_seasonal,
      available_from: x.is_seasonal && x.available_from ? x.available_from : null,
      available_until: x.is_seasonal && x.available_until ? x.available_until : null,
    }).eq("id", x.id);
    setSaving(false);
    if (error) setError(error.message); else setMessage(`${x.name} saved.`);
  };

  const saveAddon = async (x: Addon) => {
    const { error } = await createClient().from("addons").update({ name: x.name.trim(), price: Number(x.price), is_available: x.is_available }).eq("id", x.id);
    if (error) setError(error.message); else setMessage(`${x.name} saved.`);
  };

  const addItem = async () => {
    if (!categories.length) return setError("Add a category first.");
    const { data, error } = await createClient().from("menu_items").insert({ category_id: categories[0].id, name: "New menu item", description: null, price: 0, is_available: true, is_seasonal: false, available_from: null, available_until: null }).select("id,category_id,name,description,price,is_available,is_seasonal,available_from,available_until").single();
    if (error) setError(error.message); else if (data) { setItems(xs => [...xs, { ...data, price: Number(data.price) }]); setTab("menu"); setMessage("New menu item added."); }
  };

  const deleteItem = async (x: MenuItem) => {
    if (!confirm(`Delete ${x.name}?`)) return;
    const { error } = await createClient().from("menu_items").delete().eq("id", x.id);
    if (error) setError(error.message); else setItems(xs => xs.filter(y => y.id !== x.id));
  };

  const addAddon = async () => {
    const { data, error } = await createClient().from("addons").insert({ name: "New add-in", price: 0, is_available: true }).select("id,name,price,is_available").single();
    if (error) setError(error.message); else if (data) setAddons(xs => [...xs, { ...data, price: Number(data.price) }]);
  };

  const addCategory = async () => {
    const name = prompt("New category name:");
    if (!name?.trim()) return;
    const { data, error } = await createClient().from("menu_categories").insert({ name: name.trim(), sort_order: categories.length + 1 }).select("id,name,sort_order").single();
    if (error) setError(error.message); else if (data) { setCategories(xs => [...xs, data]); setMessage(`${data.name} category added.`); }
  };

  const grouped = useMemo(() => categories.map(category => ({ category, items: items.filter(x => x.category_id === category.id) })), [categories, items]);
  const today = new Date().toISOString().slice(0, 10);
  const seasonalState = (x: MenuItem) => {
    if (!x.is_seasonal) return "Regular";
    if (x.available_from && x.available_from > today) return "Coming soon";
    if (x.available_until && x.available_until < today) return "Expired";
    return "Active now";
  };
  const analytics = useMemo(() => {
    const completed = orders.filter(x => x.status === "completed");
    const revenue = completed.reduce((sum, x) => sum + x.total, 0);
    const top = new Map<string, number>();
    orderItems.forEach(x => top.set(x.item_name, (top.get(x.item_name) || 0) + x.quantity));
    return { revenue, completed: completed.length, average: completed.length ? revenue / completed.length : 0, newOrders: orders.filter(x => x.status === "new").length, top: [...top.entries()].sort((a,b) => b[1]-a[1]).slice(0,6) };
  }, [orders, orderItems]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" }, { id: "menu", label: "Manage Menu", icon: "🍹" }, { id: "prices", label: "Prices", icon: "💲" }, { id: "addons", label: "Add-Ins", icon: "➕" }, { id: "orders", label: "Orders", icon: "📦" },
  ];

  return <main className="owner-shell">
    <header className="owner-hero"><img src="/red-power-logo.png" alt="Red Power Nutrition" /><div><p>OWNER PORTAL</p><h1>CONTROL YOUR POWER.</h1><span>Manage the menu, prices, seasonal drinks, orders, and sales in one place.</span></div><button onClick={load} disabled={loading}>↻ Refresh</button></header>
    <nav className="owner-tabs">{tabs.map(t => <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>
    <div className="owner-content">
      {message && <div className="notice success">✓ {message}</div>}{error && <div className="notice error">⚠ {error}</div>}

      {tab === "dashboard" && <><section className="cards"><article><small>Completed revenue</small><strong>{money(analytics.revenue)}</strong></article><article><small>Completed orders</small><strong>{analytics.completed}</strong></article><article><small>Average order</small><strong>{money(analytics.average)}</strong></article><article><small>New orders</small><strong>{analytics.newOrders}</strong></article></section><section className="panel"><h2>Most ordered</h2>{analytics.top.length ? analytics.top.map(([name, q]) => <div className="rank" key={name}><span>{name}</span><b>{q} sold</b></div>) : <p className="muted">Order analytics will build as orders come in.</p>}</section></>}

      {tab === "menu" && <><div className="section-head"><div><p className="eyebrow">MENU CONTROL</p><h2>Manage the menu</h2><span>Create categories, add drinks, schedule monthly specials, or turn items on and off.</span></div><div><button onClick={addCategory}>+ Category</button><button className="red" onClick={addItem}>+ Menu item</button></div></div>{loading ? <p>Loading menu…</p> : grouped.map(g => <section className="panel" key={g.category.id}><h3>{g.category.name}</h3>{g.items.map(x => <div className="item-card" key={x.id}><div className="menu-edit"><input value={x.name} onChange={e => updateItem(x.id, { name: e.target.value })} /><select value={x.category_id || ""} onChange={e => updateItem(x.id, { category_id: e.target.value || null })}><option value="">No category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label><input type="checkbox" checked={x.is_available} onChange={e => updateItem(x.id, { is_available: e.target.checked })} /> Available</label><button onClick={() => saveItem(x)} disabled={saving}>Save</button><button className="danger" onClick={() => deleteItem(x)}>Delete</button></div><div className="seasonal-box"><label className="seasonal-toggle"><input type="checkbox" checked={x.is_seasonal} onChange={e => updateItem(x.id, { is_seasonal: e.target.checked, available_from: e.target.checked ? x.available_from : null, available_until: e.target.checked ? x.available_until : null })} /> 🍂 Seasonal / monthly drink</label>{x.is_seasonal && <div className="date-row"><label>Starts<input type="date" value={dateOnly(x.available_from)} onChange={e => updateItem(x.id, { available_from: e.target.value || null })} /></label><label>Ends<input type="date" value={dateOnly(x.available_until)} onChange={e => updateItem(x.id, { available_until: e.target.value || null })} /></label><span className={`season-status ${seasonalState(x).toLowerCase().replace(/ /g,"-")}`}>{seasonalState(x)}</span></div>}</div></div>)}</section>)}</>}

      {tab === "prices" && <><div className="section-head"><div><p className="eyebrow">PRICING CENTER</p><h2>Manage prices</h2><span>Each category can have its own items and pricing.</span></div><button onClick={addCategory}>+ Category</button></div>{grouped.map(g => <section className="panel price-panel" key={g.category.id}><h3>{g.category.name}</h3>{g.items.length ? g.items.map(x => <div className="price-row" key={x.id}><div><b>{x.name}</b><small>{x.is_seasonal ? `🍂 ${seasonalState(x)}${x.available_from ? ` · ${dateOnly(x.available_from)}` : ""}${x.available_until ? ` – ${dateOnly(x.available_until)}` : ""}` : "Regular menu item"}</small></div><label>$<input type="number" min="0" step="0.01" value={x.price} onChange={e => updateItem(x.id, { price: Number(e.target.value) })} /></label><button className="red" onClick={() => saveItem(x)} disabled={saving}>Save</button></div>) : <p className="muted">No items in this category yet.</p>}</section>)}</>}

      {tab === "addons" && <><div className="section-head"><div><p className="eyebrow">CUSTOMIZATION</p><h2>Add-ins & boosts</h2></div><button className="red" onClick={addAddon}>+ Add add-in</button></div><section className="panel">{addons.map(x => <div className="price-row" key={x.id}><input value={x.name} onChange={e => updateAddon(x.id, { name: e.target.value })} /><label>$<input type="number" min="0" step="0.01" value={x.price} onChange={e => updateAddon(x.id, { price: Number(e.target.value) })} /></label><label><input type="checkbox" checked={x.is_available} onChange={e => updateAddon(x.id, { is_available: e.target.checked })} /> Available</label><button className="red" onClick={() => saveAddon(x)}>Save</button></div>)}</section></>}

      {tab === "orders" && <section className="panel"><div className="section-head"><div><p className="eyebrow">ORDER HISTORY</p><h2>Recent orders</h2></div><b>{orders.length} total</b></div>{orders.slice(0, 30).map(x => <div className="order-row" key={x.id}><div><b>{new Date(x.created_at).toLocaleString()}</b><small>{x.fulfillment === "school_delivery" ? "School delivery" : "Pickup"}</small></div><span className="badge">{x.status}</span><strong>{money(x.total)}</strong></div>)}{!orders.length && <p className="muted">No orders yet.</p>}</section>}
    </div>
    <style jsx>{`
      .owner-shell{min-height:100vh;background:#f3f5f8;color:#202735;padding-bottom:48px}.owner-hero{background:#0d1017;color:#fff;min-height:150px;padding:22px max(24px,6vw);display:flex;align-items:center;gap:28px;border-bottom:5px solid #cf2927}.owner-hero img{width:230px;max-width:28vw;height:auto}.owner-hero div{flex:1}.owner-hero p,.eyebrow{margin:0 0 6px;color:#d6352e;font-weight:900;letter-spacing:2px}.owner-hero h1{font-style:italic;letter-spacing:1px;margin:0 0 8px;font-size:clamp(28px,4vw,52px)}.owner-hero span{color:#cbd0d8}.owner-hero button,.section-head button,.menu-edit button,.price-row button{border:0;border-radius:9px;padding:10px 15px;font-weight:800;cursor:pointer}.owner-tabs{max-width:1180px;margin:20px auto 0;padding:0 24px;display:flex;gap:9px;flex-wrap:wrap}.owner-tabs button{background:#fff;border:1px solid #dde2e8;padding:12px 16px;border-radius:10px;font-weight:800;cursor:pointer;color:#414959}.owner-tabs .active{background:#cf2927;color:#fff}.owner-content{max-width:1180px;margin:20px auto;padding:0 24px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.cards article,.panel{background:#fff;border:1px solid #dde2e8;border-radius:16px;padding:20px;box-shadow:0 10px 28px #1a20300c}.cards small,.price-row small,.order-row small{display:block;color:#707989;margin-top:5px}.cards strong{display:block;font-size:30px;color:#a92722;margin-top:8px}.panel{margin-top:18px}.panel h2,.panel h3{margin-top:0}.section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:18px}.section-head h2{margin:0}.section-head span{color:#707989}.section-head .red,.red{background:#cf2927!important;color:#fff}.notice{padding:13px 16px;border-radius:10px;margin-bottom:16px;font-weight:700}.success{background:#e6f4e8;color:#246b31}.error{background:#fde9e7;color:#9c2921}.rank,.price-row,.order-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #edf0f4}.rank:last-child,.price-row:last-child,.order-row:last-child{border-bottom:0}.muted{color:#707989}.menu-edit{display:grid;grid-template-columns:minmax(180px,2fr) minmax(150px,1fr) auto auto auto;gap:10px;align-items:center}.menu-edit input,.menu-edit select,.price-row input,.date-row input{padding:10px;border:1px solid #d8dde5;border-radius:8px;font:inherit}.danger{background:#fff0ef;color:#a62b26;border:1px solid #f1c2bd!important}.item-card{padding:14px 0;border-bottom:1px solid #edf0f4}.item-card:last-child{border-bottom:0}.seasonal-box{margin-top:10px;background:#fff7e6;border:1px solid #f1d18a;border-radius:10px;padding:12px}.seasonal-toggle{font-weight:800;cursor:pointer}.date-row{display:flex;align-items:flex-end;gap:12px;margin-top:10px}.date-row label{display:grid;gap:5px;font-size:13px;font-weight:800;color:#667085}.season-status{padding:9px 12px;border-radius:999px;font-size:13px;font-weight:800}.active-now{background:#e5f6ea;color:#27743b}.coming-soon{background:#e8f0ff;color:#315b9c}.expired{background:#f3f4f6;color:#6b7280}.price-row>div{flex:1}.price-row label{display:flex;align-items:center;gap:4px;font-weight:800}.price-row input[type=number]{width:95px}.badge{background:#f2f4f7;border-radius:999px;padding:6px 10px;text-transform:capitalize}.order-row>div{flex:1}@media(max-width:800px){.owner-hero{align-items:flex-start}.owner-hero img{width:120px}.cards{grid-template-columns:repeat(2,1fr)}.menu-edit{grid-template-columns:1fr 1fr}.date-row{flex-wrap:wrap}.owner-hero h1{font-size:30px}}@media(max-width:520px){.owner-hero{gap:14px;padding:18px}.owner-hero span{display:none}.cards{grid-template-columns:1fr}.menu-edit{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}.owner-content,.owner-tabs{padding-left:14px;padding-right:14px}}
    `}</style>
  </main>;
}
