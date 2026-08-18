"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab = "dashboard" | "menu" | "prices" | "addons" | "orders";
type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; is_available: boolean; is_seasonal: boolean; available_from: string | null; available_until: string | null };
type PriceOption = { id: string; menu_item_id: string; name: string; price: number; sort_order: number; is_available: boolean };
type Addon = { id: string; name: string; price: number; is_available: boolean };
type Order = { id: string; created_at: string; total: number; status: string; fulfillment: string };
type OrderItem = { item_name: string; quantity: number };

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const dateOnly = (v: string | null) => v ? v.slice(0, 10) : "";

export default function OwnerPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);
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
    const [c, i, p, a, o, oi] = await Promise.all([
      s.from("menu_categories").select("id,name,sort_order").order("sort_order"),
      s.from("menu_items").select("id,category_id,name,description,price,is_available,is_seasonal,available_from,available_until").order("name"),
      s.from("menu_item_options").select("id,menu_item_id,name,price,sort_order,is_available").order("sort_order"),
      s.from("addons").select("id,name,price,is_available").order("name"),
      s.from("orders").select("id,created_at,total,status,fulfillment").order("created_at", { ascending: false }),
      s.from("order_items").select("item_name,quantity"),
    ]);
    const first = c.error || i.error || p.error || a.error || o.error || oi.error;
    if (first) setError(first.message);
    else {
      setCategories(c.data || []);
      setItems((i.data || []).map((x: any) => ({ ...x, price: Number(x.price) || 0 })));
      setPriceOptions((p.data || []).map((x: any) => ({ ...x, price: Number(x.price) || 0, sort_order: Number(x.sort_order) || 0 })));
      setAddons((a.data || []).map((x: any) => ({ ...x, price: Number(x.price) || 0 })));
      setOrders((o.data || []).map((x: any) => ({ ...x, total: Number(x.total) || 0 })));
      setOrderItems((oi.data || []).map((x: any) => ({ ...x, quantity: Number(x.quantity) || 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const updateItem = (id: string, patch: Partial<MenuItem>) => setItems(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));
  const updateOption = (id: string, patch: Partial<PriceOption>) => setPriceOptions(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));
  const updateAddon = (id: string, patch: Partial<Addon>) => setAddons(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));

  const saveItem = async (x: MenuItem) => {
    setSaving(true); setMessage(""); setError("");
    const { error } = await createClient().from("menu_items").update({
      category_id: x.category_id, name: x.name.trim(), description: x.description?.trim() || null,
      price: Number(x.price) || 0, is_available: x.is_available, is_seasonal: x.is_seasonal,
      available_from: x.is_seasonal && x.available_from ? x.available_from : null,
      available_until: x.is_seasonal && x.available_until ? x.available_until : null,
    }).eq("id", x.id);
    setSaving(false);
    if (error) setError(error.message); else setMessage(`${x.name} saved.`);
  };

  const saveOption = async (x: PriceOption) => {
    setSaving(true); setError(""); setMessage("");
    if (!x.name.trim()) { setSaving(false); return setError("Give the price option a name, such as 20 oz or Small."); }
    const { error } = await createClient().from("menu_item_options").update({ name: x.name.trim(), price: Number(x.price) || 0, sort_order: x.sort_order, is_available: x.is_available }).eq("id", x.id);
    setSaving(false);
    if (error) setError(error.message); else setMessage(`${x.name} price saved.`);
  };

  const addPriceOption = async (menuItemId: string) => {
    setSaving(true); setError("");
    const current = priceOptions.filter(x => x.menu_item_id === menuItemId);
    const { data, error } = await createClient().from("menu_item_options").insert({ menu_item_id: menuItemId, name: "New option", price: 0, sort_order: current.length + 1, is_available: true }).select("id,menu_item_id,name,price,sort_order,is_available").single();
    setSaving(false);
    if (error) setError(error.message); else if (data) { setPriceOptions(xs => [...xs, { ...data, price: Number(data.price) || 0 }]); setMessage("New price option added."); }
  };

  const deleteOption = async (x: PriceOption) => {
    if (!confirm(`Delete ${x.name}?`)) return;
    const { error } = await createClient().from("menu_item_options").delete().eq("id", x.id);
    if (error) setError(error.message); else { setPriceOptions(xs => xs.filter(y => y.id !== x.id)); setMessage("Price option deleted."); }
  };

  const saveAddon = async (x: Addon) => {
    const { error } = await createClient().from("addons").update({ name: x.name.trim(), price: Number(x.price) || 0, is_available: x.is_available }).eq("id", x.id);
    if (error) setError(error.message); else setMessage(`${x.name} saved.`);
  };

  const addItem = async () => {
    if (!categories.length) return setError("Add a category first.");
    const { data, error } = await createClient().from("menu_items").insert({ category_id: categories[0].id, name: "New menu item", description: null, price: 0, is_available: true, is_seasonal: false, available_from: null, available_until: null }).select("id,category_id,name,description,price,is_available,is_seasonal,available_from,available_until").single();
    if (error) setError(error.message); else if (data) { setItems(xs => [...xs, { ...data, price: Number(data.price) || 0 }]); setTab("menu"); setMessage("New menu item added."); }
  };

  const deleteItem = async (x: MenuItem) => {
    if (!confirm(`Delete ${x.name}?`)) return;
    const { error } = await createClient().from("menu_items").delete().eq("id", x.id);
    if (error) setError(error.message); else { setItems(xs => xs.filter(y => y.id !== x.id)); setPriceOptions(xs => xs.filter(y => y.menu_item_id !== x.id)); }
  };

  const addAddon = async () => {
    const { data, error } = await createClient().from("addons").insert({ name: "New add-in", price: 0, is_available: true }).select("id,name,price,is_available").single();
    if (error) setError(error.message); else if (data) setAddons(xs => [...xs, { ...data, price: Number(data.price) || 0 }]);
  };

  const addCategory = async () => {
    const name = prompt("New category name:");
    if (!name?.trim()) return;
    const { data, error } = await createClient().from("menu_categories").insert({ name: name.trim(), sort_order: categories.length + 1 }).select("id,name,sort_order").single();
    if (error) setError(error.message); else if (data) { setCategories(xs => [...xs, data]); setMessage(`${data.name} category added.`); }
  };

  const grouped = useMemo(() => categories.map(category => ({ category, items: items.filter(x => x.category_id === category.id) })), [categories, items]);
  const today = new Date().toISOString().slice(0, 10);
  const seasonalState = (x: MenuItem) => !x.is_seasonal ? "Regular" : x.available_from && x.available_from > today ? "Coming soon" : x.available_until && x.available_until < today ? "Expired" : "Active now";
  const analytics = useMemo(() => {
    const completed = orders.filter(x => x.status === "completed");
    const revenue = completed.reduce((sum, x) => sum + x.total, 0);
    const top = new Map<string, number>(); orderItems.forEach(x => top.set(x.item_name, (top.get(x.item_name) || 0) + x.quantity));
    return { revenue, completed: completed.length, average: completed.length ? revenue / completed.length : 0, newOrders: orders.filter(x => x.status === "new").length, top: [...top.entries()].sort((a,b) => b[1]-a[1]).slice(0,6) };
  }, [orders, orderItems]);
  const tabs: { id: Tab; label: string; icon: string }[] = [{ id:"dashboard",label:"Dashboard",icon:"📊" },{ id:"menu",label:"Manage Menu",icon:"🍹" },{ id:"prices",label:"Prices",icon:"💲" },{ id:"addons",label:"Add-Ins",icon:"➕" },{ id:"orders",label:"Orders",icon:"📦" }];

  return <main className="owner-shell">
    <header className="owner-hero"><img src="/red-power-logo.png" alt="Red Power Nutrition" /><div><p>OWNER PORTAL</p><h1>CONTROL YOUR POWER.</h1><span>Manage the menu, prices, seasonal drinks, orders, and sales in one place.</span></div><button onClick={load} disabled={loading}>↻ Refresh</button></header>
    <nav className="owner-tabs">{tabs.map(t => <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>
    <div className="owner-content">
      {message && <div className="notice success">✓ {message}</div>}{error && <div className="notice error">⚠ {error}</div>}
      {tab === "dashboard" && <><section className="cards"><article><small>Completed revenue</small><strong>{money(analytics.revenue)}</strong></article><article><small>Completed orders</small><strong>{analytics.completed}</strong></article><article><small>Average order</small><strong>{money(analytics.average)}</strong></article><article><small>New orders</small><strong>{analytics.newOrders}</strong></article></section><section className="panel"><h2>Most ordered</h2>{analytics.top.length ? analytics.top.map(([name,q]) => <div className="rank" key={name}><span>{name}</span><b>{q} sold</b></div>) : <p className="muted">Order analytics will build as orders come in.</p>}</section></>}
      {tab === "menu" && <><div className="section-head"><div><p className="eyebrow">MENU CONTROL</p><h2>Manage the menu</h2><span>Create categories, add drinks, schedule monthly specials, or turn items on and off.</span></div><div><button onClick={addCategory}>+ Category</button><button className="red" onClick={addItem}>+ Menu item</button></div></div>{loading ? <p>Loading menu…</p> : grouped.map(g => <section className="panel" key={g.category.id}><h3>{g.category.name}</h3>{g.items.map(x => <div className="item-card" key={x.id}><div className="menu-edit"><input value={x.name} onChange={e => updateItem(x.id,{name:e.target.value})}/><select value={x.category_id || ""} onChange={e=>updateItem(x.id,{category_id:e.target.value||null})}><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label><input type="checkbox" checked={x.is_available} onChange={e=>updateItem(x.id,{is_available:e.target.checked})}/> Available</label><button onClick={()=>saveItem(x)} disabled={saving}>Save</button><button className="danger" onClick={()=>deleteItem(x)}>Delete</button></div><div className="seasonal-box"><label><input type="checkbox" checked={x.is_seasonal} onChange={e=>updateItem(x.id,{is_seasonal:e.target.checked,available_from:e.target.checked?x.available_from:null,available_until:e.target.checked?x.available_until:null})}/> 🍂 Seasonal / monthly drink</label>{x.is_seasonal && <div className="date-row"><label>Starts<input type="date" value={dateOnly(x.available_from)} onChange={e=>updateItem(x.id,{available_from:e.target.value||null})}/></label><label>Ends<input type="date" value={dateOnly(x.available_until)} onChange={e=>updateItem(x.id,{available_until:e.target.value||null})}/></label><span>{seasonalState(x)}</span></div>}</div></div>)}</section>)}</>}
      {tab === "prices" && <><div className="section-head"><div><p className="eyebrow">PRICING CENTER</p><h2>Manage prices</h2><span>Give every drink as many size, flavor, or other price options as it needs.</span></div><button onClick={addCategory}>+ Category</button></div>{loading ? <p>Loading prices…</p> : grouped.map(g => <section className="panel price-panel" key={g.category.id}><h3>{g.category.name}</h3>{g.items.length ? g.items.map(item => { const options = priceOptions.filter(x => x.menu_item_id === item.id); return <div className="option-card" key={item.id}><div className="option-title"><div><b>{item.name}</b><small>{item.is_seasonal ? `🍂 ${seasonalState(item)}` : "Regular menu item"}</small></div><button onClick={()=>addPriceOption(item.id)} disabled={saving}>+ Add price option</button></div>{options.length ? options.map(x => <div className="option-row" key={x.id}><input aria-label="Option name" value={x.name} placeholder="20 oz, Small, Regular…" onChange={e=>updateOption(x.id,{name:e.target.value})}/><label className="money-input">$<input aria-label="Price" type="number" min="0" step="0.01" value={x.price} onChange={e=>updateOption(x.id,{price:Number(e.target.value)})}/></label><label className="available"><input type="checkbox" checked={x.is_available} onChange={e=>updateOption(x.id,{is_available:e.target.checked})}/> Available</label><button className="red" onClick={()=>saveOption(x)} disabled={saving}>Save</button><button className="danger" onClick={()=>deleteOption(x)} disabled={saving}>×</button></div>) : <p className="muted">No price options yet. Add one to get started.</p>}</div> }) : <p className="muted">No items in this category yet.</p>}</section>)}</>}
      {tab === "addons" && <><div className="section-head"><div><p className="eyebrow">CUSTOMIZATION</p><h2>Add-ins & boosts</h2></div><button className="red" onClick={addAddon}>+ Add add-in</button></div><section className="panel">{addons.map(x=><div className="price-row" key={x.id}><input value={x.name} onChange={e=>updateAddon(x.id,{name:e.target.value})}/><label>$<input type="number" min="0" step="0.01" value={x.price} onChange={e=>updateAddon(x.id,{price:Number(e.target.value)})}/></label><label><input type="checkbox" checked={x.is_available} onChange={e=>updateAddon(x.id,{is_available:e.target.checked})}/> Available</label><button className="red" onClick={()=>saveAddon(x)}>Save</button></div>)}</section></>}
      {tab === "orders" && <section className="panel"><div className="section-head"><div><p className="eyebrow">ORDER HISTORY</p><h2>Recent orders</h2></div><b>{orders.length} total</b></div>{orders.slice(0,30).map(x=><div className="order-row" key={x.id}><div><b>{new Date(x.created_at).toLocaleString()}</b><small>{x.fulfillment === "school_delivery" ? "School delivery" : "Pickup"}</small></div><span className="badge">{x.status}</span><strong>{money(x.total)}</strong></div>)}{!orders.length && <p className="muted">No orders yet.</p>}</section>}
    </div>
    <style jsx>{`
      .owner-shell{min-height:100vh;background:#f3f5f8;color:#202735;padding-bottom:48px}.owner-hero{background:#0d1017;color:#fff;min-height:150px;padding:22px max(24px,6vw);display:flex;align-items:center;gap:28px;border-bottom:5px solid #cf2927}.owner-hero img{width:230px;max-width:28vw;height:auto}.owner-hero div{flex:1}.owner-hero p,.eyebrow{margin:0 0 6px;color:#d6352e;font-weight:900;letter-spacing:2px}.owner-hero h1{font-style:italic;letter-spacing:1px;margin:0 0 8px;font-size:clamp(28px,4vw,52px)}.owner-hero span{color:#cbd0d8}.owner-hero button,.section-head button,.menu-edit button,.price-row button,.option-row button,.option-title button{border:0;border-radius:9px;padding:10px 15px;font-weight:800;cursor:pointer}.owner-tabs{max-width:1180px;margin:20px auto 0;padding:0 24px;display:flex;gap:9px;flex-wrap:wrap}.owner-tabs button{background:#fff;border:1px solid #dde2e8;padding:12px 16px;border-radius:10px;font-weight:800;cursor:pointer;color:#414959}.owner-tabs .active,.red{background:#cf2927!important;color:#fff}.owner-content{max-width:1180px;margin:20px auto;padding:0 24px}.notice,.panel{background:#fff;border:1px solid #dfe4ea;border-radius:16px;box-shadow:0 8px 25px rgba(31,40,55,.06)}.notice{padding:14px 16px;margin-bottom:14px}.success{color:#25723a;background:#eef8ef}.error{color:#9b3328;background:#fff1ef}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}.cards article{background:#fff;border:1px solid #dfe4ea;border-radius:16px;padding:20px}.cards small,.panel small,.option-title small{display:block;color:#697386;margin-top:5px}.cards strong{display:block;font-size:30px;color:#9f3025;margin-top:8px}.panel{padding:20px;margin-bottom:18px}.section-head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:16px}.section-head h2{margin:0 0 5px}.section-head span{color:#697386}.section-head>div:last-child{display:flex;gap:8px}.item-card{border-top:1px solid #e5e8ec;padding:15px 0}.menu-edit,.price-row,.option-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.menu-edit input,.menu-edit select,.price-row input,.option-row input{padding:10px;border:1px solid #d6dce4;border-radius:8px;font:inherit;background:#fff}.menu-edit>input{min-width:220px;flex:1}.seasonal-box{margin-top:12px;background:#faf7f4;border-radius:10px;padding:12px}.date-row{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-top:10px}.date-row label{display:grid;gap:5px;font-size:13px}.date-row input{padding:8px;border:1px solid #d6dce4;border-radius:7px}.price-panel h3{margin-top:0}.option-card{border-top:1px solid #e5e8ec;padding:16px 0}.option-card:first-of-type{border-top:0}.option-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.option-title b{font-size:17px}.option-title button{background:#eef1f5;color:#202735}.option-row{padding:9px;background:#fafbfc;border:1px solid #e7ebef;border-radius:11px;margin-top:8px}.option-row>input{flex:1;min-width:190px}.money-input{display:flex;align-items:center;gap:4px;font-weight:800}.money-input input{width:110px}.available{font-size:13px;white-space:nowrap}.danger{background:#fee8e5!important;color:#a5342a}.rank,.order-row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e7eaee;padding:13px 0}.rank:first-of-type{border-top:0}.order-row small{display:block;color:#697386;margin-top:4px}.badge{background:#f0f2f5;border-radius:999px;padding:5px 10px;font-size:12px;text-transform:capitalize}.muted{color:#7b8492}@media(max-width:760px){.owner-hero{padding:18px;gap:14px}.owner-hero img{width:115px}.owner-hero h1{font-size:26px}.owner-hero span{font-size:13px}.cards{grid-template-columns:repeat(2,1fr)}.owner-tabs,.owner-content{padding-left:14px;padding-right:14px}.section-head,.option-title{align-items:flex-start;flex-direction:column}.option-row{align-items:stretch}.option-row>input{width:100%}.money-input input{flex:1;width:auto}.owner-hero button{display:none}}
    `}</style>
  </main>;
}
