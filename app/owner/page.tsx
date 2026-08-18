"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab = "dashboard" | "menu" | "prices" | "addons" | "orders";
type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; is_available: boolean; is_seasonal: boolean };
type Addon = { id: string; name: string; price: number; is_available: boolean };
type Order = { id: string; created_at: string; total: number; status: string; fulfillment: string };
type OrderItem = { item_name: string; unit_price: number; quantity: number; order_id: string };

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const photoPricing = [
  ["TEAS", ["Fun Water - 16oz — $1.00", "Fun Water - 32oz — $2.00", "Level 1 - 20oz — $3.00", "Level 1 - 32oz — $4.00", "Level 2 - 20oz — $6.50", "Level 2 - 32oz — $7.50", "Whipped M1 — $6.50", "Whipped M2 — $10.00", "Liftoff Only 20oz — $5.00", "Liftoff only 32oz — $6.00", "M1 to-go teas — $4.00", "M2 to-go teas — $7.50"]],
  ["PROTEIN COFFEE", ["Boujee Brew - 32oz — $9.00", "Hot Coffee - 20oz — $5.50", "Iced coffee - 20oz — $5.50", "Iced Coffee - 32oz — $6.50", "Hot Chocolate — $5.00"]],
  ["NO CAFFEINE", ["Protein Punch 20oz — $4.00", "Protein Punch 32oz — $5.00", "Hydration Tea 20oz — $4.00", "Hydration Tea 32oz — $5.00"]],
  ["SHAKES", ["Shake only — $8.00", "Kids Shake — $5.00", "Rebuild Shake — $10.00"]],
  ["COMBOS", ["Level 1-20oz combo — $10.00", "Level 2-20oz combo — $13.00", "Level 1-32oz combo — $11.00", "Level 2-32oz combo — $14.00", "Rebuild L1 combo — $12.00", "Rebuild L2 combo — $15.00", "Rebuild M1 combo — $13.00", "Rebuild M2 combo — $16.00"]],
  ["ADD IN", ["Beauty Boost — $2.50", "Best Defense — $2.50", "H3O — $3.00", "Immunity — $2.00", "CR7 — $1.50", "Creatine — $1.50", "Niteworks — $4.50", "Probiotic — $1.50"]],
  ["DESSERTS", ["Protein Bites — $5.00", "Pudding Cups — $5.00"]],
] as const;

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
      s.from("menu_items").select("id,category_id,name,description,price,is_available,is_seasonal").order("name"),
      s.from("addons").select("id,name,price,is_available").order("name"),
      s.from("orders").select("id,created_at,total,status,fulfillment").order("created_at", { ascending: false }),
      s.from("order_items").select("item_name,unit_price,quantity,order_id"),
    ]);
    const first = c.error || i.error || a.error || o.error || oi.error;
    if (first) setError(first.message);
    else {
      setCategories(c.data || []);
      setItems((i.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setAddons((a.data || []).map((x: any) => ({ ...x, price: Number(x.price) })));
      setOrders((o.data || []).map((x: any) => ({ ...x, total: Number(x.total) })));
      setOrderItems((oi.data || []).map((x: any) => ({ ...x, unit_price: Number(x.unit_price), quantity: Number(x.quantity) })));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateItem = (id: string, patch: Partial<MenuItem>) => setItems(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));
  const updateAddon = (id: string, patch: Partial<Addon>) => setAddons(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x));
  const saveItem = async (x: MenuItem) => { setSaving(true); setMessage(""); const { error } = await createClient().from("menu_items").update({ category_id:x.category_id, name:x.name.trim(), description:x.description?.trim() || null, price:Number(x.price), is_available:x.is_available, is_seasonal:x.is_seasonal }).eq("id",x.id); setSaving(false); if(error) setError(error.message); else setMessage(`${x.name} saved.`); };
  const saveAddon = async (x: Addon) => { setSaving(true); setMessage(""); const { error } = await createClient().from("addons").update({ name:x.name.trim(), price:Number(x.price), is_available:x.is_available }).eq("id",x.id); setSaving(false); if(error) setError(error.message); else setMessage(`${x.name} saved.`); };
  const addItem = async () => { if(!categories.length) return setError("Add a category first."); setSaving(true); const {data,error}=await createClient().from("menu_items").insert({category_id:categories[0].id,name:"New menu item",description:null,price:0,is_available:true,is_seasonal:false}).select("id,category_id,name,description,price,is_available,is_seasonal").single(); setSaving(false); if(error) setError(error.message); else if(data){setItems(xs=>[...xs,{...data,price:Number(data.price)}]);setTab("menu");setMessage("New item added.");} };
  const deleteItem = async (x: MenuItem) => { if(!confirm(`Delete ${x.name}?`)) return; const {error}=await createClient().from("menu_items").delete().eq("id",x.id); if(error)setError(error.message); else setItems(xs=>xs.filter(y=>y.id!==x.id)); };
  const addAddon = async () => { const {data,error}=await createClient().from("addons").insert({name:"New add-in",price:0,is_available:true}).select("id,name,price,is_available").single(); if(error)setError(error.message); else if(data)setAddons(xs=>[...xs,{...data,price:Number(data.price)}]); };
  const addCategory = async () => { const name=prompt("New category name:"); if(!name?.trim())return; const {data,error}=await createClient().from("menu_categories").insert({name:name.trim(),sort_order:categories.length+1}).select("id,name,sort_order").single(); if(error)setError(error.message); else if(data)setCategories(xs=>[...xs,data]); };

  const analytics = useMemo(() => {
    const completed=orders.filter(x=>x.status==="completed"); const revenue=completed.reduce((s,x)=>s+x.total,0);
    const top=new Map<string,number>(); orderItems.forEach(x=>top.set(x.item_name,(top.get(x.item_name)||0)+x.quantity));
    return { revenue, completed:completed.length, average:completed.length?revenue/completed.length:0, top:[...top.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6), new:orders.filter(x=>x.status==="new").length };
  },[orders,orderItems]);
  const grouped = useMemo(() => categories.map(c=>({category:c,items:items.filter(x=>x.category_id===c.id)})).concat(items.filter(x=>!x.category_id).length?[{category:{id:"none",name:"Other",sort_order:999},items:items.filter(x=>!x.category_id)}]:[]),[categories,items]);
  const tabs: {id:Tab;label:string;icon:string}[] = [{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"menu",label:"Manage Menu",icon:"🍹"},{id:"prices",label:"Prices",icon:"💲"},{id:"addons",label:"Add-Ins",icon:"➕"},{id:"orders",label:"Orders",icon:"📦"}];

  return <main className="owner-shell">
    <header className="owner-hero"><img src="/red-power-logo.png" alt="Red Power Nutrition"/><div><p>OWNER PORTAL</p><h1>CONTROL YOUR POWER.</h1><span>Manage the menu, prices, add-ins, orders, and sales in one place.</span></div><button onClick={load} disabled={loading}>↻ Refresh</button></header>
    <nav className="owner-tabs">{tabs.map(t=><button key={t.id} className={tab===t.id?"active":""} onClick={()=>setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>
    <div className="owner-content">{message&&<div className="notice success">✓ {message}</div>}{error&&<div className="notice error">{error}</div>}

      {tab==="dashboard" && <><section className="cards"><article><small>Completed revenue</small><strong>{money(analytics.revenue)}</strong></article><article><small>Completed orders</small><strong>{analytics.completed}</strong></article><article><small>Average order</small><strong>{money(analytics.average)}</strong></article><article><small>New orders</small><strong>{analytics.new}</strong></article></section><section className="panel"><h2>Most ordered</h2>{analytics.top.length?analytics.top.map(([name,q])=><div className="rank" key={name}><span>{name}</span><b>{q} sold</b></div>):<p className="muted">Order analytics will build as orders come in.</p>}</section></>}

      {tab==="menu" && <><div className="section-head"><div><p className="eyebrow">MENU CONTROL</p><h2>Manage the menu</h2><span>Add drinks, rename them, move them between categories, or turn them on and off.</span></div><div><button onClick={addCategory}>+ Category</button><button className="red" onClick={addItem}>+ Menu item</button></div></div>{loading?<p>Loading menu…</p>:grouped.map(g=><section className="panel" key={g.category.id}><h3>{g.category.name}</h3>{g.items.map(x=><div className="menu-edit" key={x.id}><input value={x.name} onChange={e=>updateItem(x.id,{name:e.target.value})}/><select value={x.category_id||""} onChange={e=>updateItem(x.id,{category_id:e.target.value||null})}><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label><input type="checkbox" checked={x.is_available} onChange={e=>updateItem(x.id,{is_available:e.target.checked})}/> Available</label><button onClick={()=>saveItem(x)} disabled={saving}>Save</button><button className="danger" onClick={()=>deleteItem(x)}>Delete</button></div>)}</section>)}</>}

      {tab==="prices" && <><div className="section-head"><div><p className="eyebrow">PRICING CENTER</p><h2>Manage prices</h2><span>Change a price here and it updates the customer menu.</span></div></div>{grouped.map(g=><section className="panel price-panel" key={g.category.id}><h3>{g.category.name}</h3>{g.items.length?g.items.map(x=><div className="price-row" key={x.id}><div><b>{x.name}</b>{x.description&&<small>{x.description}</small>}</div><label>$<input type="number" min="0" step="0.01" value={x.price} onChange={e=>updateItem(x.id,{price:Number(e.target.value)})}/></label><button className="red" onClick={()=>saveItem(x)} disabled={saving}>Save</button></div>):<p className="muted">No items in this category yet.</p>}</section>)}<section className="panel reference"><h3>Current pricing sheet reference</h3><p className="muted">This is the pricing from the photo you sent. Use it as the starting point while setting up the live menu.</p><div className="reference-grid">{photoPricing.map(([title,rows])=><div key={title}><b>{title}</b>{rows.map(r=><span key={r}>{r}</span>)}</div>)}</div></section></>}

      {tab==="addons" && <><div className="section-head"><div><p className="eyebrow">CUSTOMIZATION</p><h2>Add-ins & boosts</h2></div><button className="red" onClick={addAddon}>+ Add add-in</button></div><section className="panel">{addons.map(x=><div className="price-row" key={x.id}><input value={x.name} onChange={e=>updateAddon(x.id,{name:e.target.value})}/><label>$<input type="number" min="0" step="0.01" value={x.price} onChange={e=>updateAddon(x.id,{price:Number(e.target.value)})}/></label><label><input type="checkbox" checked={x.is_available} onChange={e=>updateAddon(x.id,{is_available:e.target.checked})}/> Available</label><button className="red" onClick={()=>saveAddon(x)}>Save</button></div>)}</section></>}

      {tab==="orders" && <section className="panel"><div className="section-head"><div><p className="eyebrow">ORDER HISTORY</p><h2>Recent orders</h2></div><b>{orders.length} total</b></div>{orders.slice(0,30).map(x=><div className="order-row" key={x.id}><div><b>{new Date(x.created_at).toLocaleString()}</b><small>{x.fulfillment==="school_delivery"?"School delivery":"Pickup"}</small></div><span className={`badge ${x.status}`}>{x.status}</span><strong>{money(x.total)}</strong></div>)}{!orders.length&&<p className="muted">No orders yet.</p>}</section>}
    </div>
    <style jsx>{`
      .owner-shell{min-height:100vh;background:#f3f5f8;color:#202735;padding-bottom:48px}.owner-hero{background:#0d1017;color:#fff;min-height:150px;padding:22px max(24px,6vw);display:flex;align-items:center;gap:28px;border-bottom:5px solid #cf2927}.owner-hero img{width:230px;max-width:28vw;height:auto}.owner-hero div{flex:1}.owner-hero p,.eyebrow{margin:0 0 6px;color:#d6352e;font-weight:900;letter-spacing:2px}.owner-hero h1{font-style:italic;letter-spacing:1px;margin:0 0 8px;font-size:clamp(28px,4vw,52px)}.owner-hero span{color:#cbd0d8}.owner-hero button,.section-head button,.menu-edit button,.price-row button{border:0;border-radius:9px;padding:10px 15px;font-weight:800;cursor:pointer}.owner-tabs{max-width:1180px;margin:20px auto 0;padding:0 24px;display:flex;gap:9px;flex-wrap:wrap}.owner-tabs button{background:#fff;border:1px solid #dde2e8;padding:12px 16px;border-radius:11px;font-weight:800;color:#465062;cursor:pointer}.owner-tabs button.active{background:#20242c;color:#fff;border-color:#20242c;box-shadow:0 7px 18px #20242c30}.owner-tabs span{margin-right:7px}.owner-content{max-width:1180px;margin:20px auto;padding:0 24px}.notice{padding:12px 15px;border-radius:10px;margin-bottom:14px}.success{background:#e5f5e9;color:#24683b}.error{background:#fee9e8;color:#a52622}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:18px}.cards article,.panel{background:#fff;border:1px solid #e1e5eb;border-radius:16px;padding:20px;box-shadow:0 7px 20px #1d27310c}.cards strong{display:block;font-size:30px;color:#a82923;margin-top:7px}.cards small,.muted,.panel span{color:#758093}.rank,.order-row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid #edf0f3}.section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:26px 0 15px}.section-head h2{margin:0 0 6px;font-size:29px}.section-head span{color:#687487}.section-head button{margin-left:8px}.red{background:#cf2927!important;color:white}.danger{background:#fee5e3;color:#9c2721}.menu-edit{display:grid;grid-template-columns:2fr 1.2fr auto auto auto;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #edf0f3}.menu-edit input,.menu-edit select,.price-row input{border:1px solid #d9dee5;border-radius:8px;padding:10px;font:inherit;min-width:0}.price-panel{margin-bottom:14px}.price-panel h3{margin-top:0;color:#a82923;letter-spacing:.5px}.price-row{display:grid;grid-template-columns:1fr 160px 90px;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid #edf0f3}.price-row small{display:block;color:#7c8796;margin-top:3px}.price-row label{display:flex;align-items:center;gap:4px;font-weight:800}.price-row label input[type=number]{width:100%}.reference{margin-top:20px}.reference-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.reference-grid>div{background:#f7f8fa;border-radius:10px;padding:14px}.reference-grid b,.reference-grid span{display:block}.reference-grid b{color:#a82923;margin-bottom:8px}.reference-grid span{font-size:14px;padding:3px 0}.badge{padding:5px 10px;border-radius:999px;background:#edf0f4;text-transform:capitalize;font-weight:800}.badge.new{background:#fce7e7;color:#b42318}.badge.making{background:#fff1d6;color:#a35f00}.badge.ready{background:#e7f3ff;color:#2563a8}.badge.completed{background:#e5f5e9;color:#277143}.order-row small{display:block;margin-top:4px}@media(max-width:800px){.owner-hero{padding:18px 20px;flex-wrap:wrap}.owner-hero img{width:150px;max-width:42vw}.cards{grid-template-columns:repeat(2,1fr)}.menu-edit,.price-row{grid-template-columns:1fr}.section-head{align-items:start;flex-direction:column}.owner-content,.owner-tabs{padding-left:14px;padding-right:14px}}
    `}</style>
  </main>;
}
