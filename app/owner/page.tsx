"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab = "dashboard" | "menu" | "prices" | "addons" | "specials" | "orders";
type MenuCategory = { id:string; name:string; sort_order:number };
type MenuItem = { id:string; category_id:string|null; name:string; is_available:boolean };
type PricingCategory = { id:string; name:string; sort_order:number };
type PricingOption = { id:string; pricing_category_id:string; name:string; price:number; sort_order:number; is_available:boolean };
type Addon = { id:string; name:string; price:number; is_available:boolean };
type SpecialMenu = { id:string; name:string; menu_type:string; starts_on:string|null; ends_on:string|null; repeats_yearly:boolean; is_active:boolean };
type SpecialItem = { id:string; special_menu_id:string; name:string; description:string|null; menu_category_id:string|null; is_available:boolean; sort_order:number };
type Order = { id:string; created_at:string; total:number; status:string; fulfillment:string|null };
type OrderItem = { item_name:string; quantity:number };

const money = (n:number) => `$${Number(n || 0).toFixed(2)}`;
const dateValue = (v:string|null) => v ? v.slice(0,10) : "";

export default function OwnerPage() {
  const s = createClient();
  const [tab,setTab] = useState<Tab>("dashboard");
  const [menuCategories,setMenuCategories] = useState<MenuCategory[]>([]);
  const [items,setItems] = useState<MenuItem[]>([]);
  const [pricingCategories,setPricingCategories] = useState<PricingCategory[]>([]);
  const [pricingOptions,setPricingOptions] = useState<PricingOption[]>([]);
  const [addons,setAddons] = useState<Addon[]>([]);
  const [specialMenus,setSpecialMenus] = useState<SpecialMenu[]>([]);
  const [specialItems,setSpecialItems] = useState<SpecialItem[]>([]);
  const [orders,setOrders] = useState<Order[]>([]);
  const [orderItems,setOrderItems] = useState<OrderItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const [mc,mi,pc,po,a,sm,si,o,oi] = await Promise.all([
      s.from("menu_categories").select("id,name,sort_order").order("sort_order"),
      s.from("menu_items").select("id,category_id,name,is_available").order("name"),
      s.from("pricing_categories").select("id,name,sort_order").order("sort_order"),
      s.from("pricing_options").select("id,pricing_category_id,name,price,sort_order,is_available").order("sort_order"),
      s.from("addons").select("id,name,price,is_available").order("name"),
      s.from("special_menus").select("id,name,menu_type,starts_on,ends_on,repeats_yearly,is_active").order("starts_on"),
      s.from("special_menu_items").select("id,special_menu_id,name,description,menu_category_id,is_available,sort_order").order("sort_order"),
      s.from("orders").select("id,created_at,total,status,fulfillment").order("created_at",{ascending:false}),
      s.from("order_items").select("item_name,quantity")
    ]);
    const first = mc.error || mi.error || pc.error || po.error || a.error || sm.error || si.error || o.error || oi.error;
    if (first) setError(first.message);
    else {
      setMenuCategories(mc.data || []); setItems(mi.data || []);
      setPricingCategories(pc.data || []); setPricingOptions((po.data || []).map((x:any)=>({...x,price:Number(x.price)||0})));
      setAddons((a.data || []).map((x:any)=>({...x,price:Number(x.price)||0})));
      setSpecialMenus(sm.data || []); setSpecialItems(si.data || []);
      setOrders((o.data || []).map((x:any)=>({...x,total:Number(x.total)||0})));
      setOrderItems((oi.data || []).map((x:any)=>({...x,quantity:Number(x.quantity)||0})));
    }
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const updatePrice = (id:string,patch:Partial<PricingOption>) => setPricingOptions(xs=>xs.map(x=>x.id===id?{...x,...patch}:x));
  const updateSpecial = (id:string,patch:Partial<SpecialMenu>) => setSpecialMenus(xs=>xs.map(x=>x.id===id?{...x,...patch}:x));
  const updateSpecialItem = (id:string,patch:Partial<SpecialItem>) => setSpecialItems(xs=>xs.map(x=>x.id===id?{...x,...patch}:x));
  const updateAddon = (id:string,patch:Partial<Addon>) => setAddons(xs=>xs.map(x=>x.id===id?{...x,...patch}:x));

  const addPricingCategory = async () => {
    const name = prompt("Pricing category name (for example, Teas or Combos):"); if(!name?.trim()) return;
    const {data,error} = await s.from("pricing_categories").insert({name:name.trim(),sort_order:pricingCategories.length+1}).select("id,name,sort_order").single();
    if(error) setError(error.message); else if(data){setPricingCategories(xs=>[...xs,data]);setMessage(`${data.name} pricing category added.`);}
  };
  const addPricingOption = async (categoryId:string) => {
    const count = pricingOptions.filter(x=>x.pricing_category_id===categoryId).length;
    const {data,error} = await s.from("pricing_options").insert({pricing_category_id:categoryId,name:"New price",price:0,sort_order:count+1,is_available:true}).select("id,pricing_category_id,name,price,sort_order,is_available").single();
    if(error) setError(error.message); else if(data){setPricingOptions(xs=>[...xs,{...data,price:Number(data.price)||0}]);setMessage("New price row added.");}
  };
  const savePricingOption = async (x:PricingOption) => {
    if(!x.name.trim()) return setError("Give this price a name."); setSaving(true); setError("");
    const {error} = await s.from("pricing_options").update({name:x.name.trim(),price:Number(x.price)||0,is_available:x.is_available,sort_order:x.sort_order}).eq("id",x.id);
    setSaving(false); if(error)setError(error.message);else setMessage(`${x.name} saved.`);
  };
  const deletePricingOption = async (x:PricingOption) => { if(!confirm(`Delete ${x.name}?`))return; const {error}=await s.from("pricing_options").delete().eq("id",x.id); if(error)setError(error.message);else setPricingOptions(xs=>xs.filter(y=>y.id!==x.id)); };

  const addSpecialMenu = async () => {
    const {data,error} = await s.from("special_menus").insert({name:"New special menu",menu_type:"monthly",starts_on:null,ends_on:null,repeats_yearly:false,is_active:false}).select("id,name,menu_type,starts_on,ends_on,repeats_yearly,is_active").single();
    if(error)setError(error.message);else if(data){setSpecialMenus(xs=>[...xs,data]);setMessage("New special menu created.");}
  };
  const saveSpecialMenu = async (x:SpecialMenu) => {
    const {error} = await s.from("special_menus").update({name:x.name.trim(),menu_type:x.menu_type,starts_on:x.starts_on||null,ends_on:x.ends_on||null,repeats_yearly:x.repeats_yearly,is_active:x.is_active}).eq("id",x.id);
    if(error)setError(error.message);else setMessage(`${x.name} saved.`);
  };
  const deleteSpecialMenu = async (x:SpecialMenu) => {if(!confirm(`Delete ${x.name} and its drinks?`))return;const {error}=await s.from("special_menus").delete().eq("id",x.id);if(error)setError(error.message);else{setSpecialMenus(xs=>xs.filter(y=>y.id!==x.id));setSpecialItems(xs=>xs.filter(y=>y.special_menu_id!==x.id));}};
  const addSpecialItem = async (menuId:string) => {
    const count=specialItems.filter(x=>x.special_menu_id===menuId).length;
    const {data,error}=await s.from("special_menu_items").insert({special_menu_id:menuId,name:"New special drink",description:null,menu_category_id:null,is_available:true,sort_order:count+1}).select("id,special_menu_id,name,description,menu_category_id,is_available,sort_order").single();
    if(error)setError(error.message);else if(data)setSpecialItems(xs=>[...xs,data]);
  };
  const saveSpecialItem = async (x:SpecialItem) => {const {error}=await s.from("special_menu_items").update({name:x.name.trim(),description:x.description?.trim()||null,menu_category_id:x.menu_category_id||null,is_available:x.is_available}).eq("id",x.id);if(error)setError(error.message);else setMessage(`${x.name} saved.`);};
  const deleteSpecialItem = async (x:SpecialItem) => {const {error}=await s.from("special_menu_items").delete().eq("id",x.id);if(error)setError(error.message);else setSpecialItems(xs=>xs.filter(y=>y.id!==x.id));};

  const saveAddon = async (x:Addon) => {const {error}=await s.from("addons").update({name:x.name.trim(),price:Number(x.price)||0,is_available:x.is_available}).eq("id",x.id);if(error)setError(error.message);else setMessage(`${x.name} saved.`);};
  const addAddon = async ()=>{const {data,error}=await s.from("addons").insert({name:"New add-in",price:0,is_available:true}).select("id,name,price,is_available").single();if(error)setError(error.message);else if(data)setAddons(xs=>[...xs,{...data,price:Number(data.price)||0}]);};

  const analytics = useMemo(()=>{const completed=orders.filter(x=>x.status==="completed");const revenue=completed.reduce((n,x)=>n+x.total,0);const top=new Map<string,number>();orderItems.forEach(x=>top.set(x.item_name,(top.get(x.item_name)||0)+x.quantity));return{revenue,completed:completed.length,average:completed.length?revenue/completed.length:0,newOrders:orders.filter(x=>x.status==="new").length,top:[...top.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)}},[orders,orderItems]);
  const tabs:{id:Tab;label:string;icon:string}[]=[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"menu",label:"Manage Menu",icon:"🍹"},{id:"prices",label:"Prices",icon:"💲"},{id:"addons",label:"Add-Ins",icon:"➕"},{id:"specials",label:"Seasonal & Specials",icon:"🌟"},{id:"orders",label:"Orders",icon:"📦"}];

  return <main className="owner-shell">
    <header className="owner-hero"><img src="/red-power-logo.png" alt="Red Power Nutrition"/><div><p>OWNER PORTAL</p><h1>CONTROL YOUR POWER.</h1><span>Manage the menu, shared prices, special menus, orders, and sales.</span></div><button onClick={load} disabled={loading}>↻ Refresh</button></header>
    <nav className="owner-tabs">{tabs.map(t=><button key={t.id} className={tab===t.id?"active":""} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</button>)}</nav>
    <div className="owner-content">
      {message&&<div className="notice success">✓ {message}</div>}{error&&<div className="notice error">⚠ {error}</div>}
      {tab==="dashboard"&&<><section className="cards"><article><small>Completed revenue</small><strong>{money(analytics.revenue)}</strong></article><article><small>Completed orders</small><strong>{analytics.completed}</strong></article><article><small>Average order</small><strong>{money(analytics.average)}</strong></article><article><small>New orders</small><strong>{analytics.newOrders}</strong></article></section><section className="panel"><h2>Most ordered</h2>{analytics.top.length?analytics.top.map(([name,q])=><div className="rank" key={name}><span>{name}</span><b>{q} sold</b></div>):<p className="muted">Order analytics will build as orders come in.</p>}</section></>}
      {tab==="menu"&&<><div className="section-head"><div><p className="eyebrow">REGULAR MENU</p><h2>Manage the menu</h2><span>Regular drink flavors and menu items live here. Prices are managed separately.</span></div></div>{menuCategories.map(c=><section className="panel" key={c.id}><h3>{c.name}</h3>{items.filter(x=>x.category_id===c.id).map(x=><div className="simple-row" key={x.id}><b>{x.name}</b><span>{x.is_available?"Available":"Hidden"}</span></div>)}{!items.some(x=>x.category_id===c.id)&&<p className="muted">No regular menu items yet.</p>}</section>)}</>}
      {tab==="prices"&&<><div className="section-head"><div><p className="eyebrow">PRICING CENTER</p><h2>Manage prices</h2><span>These are shared price rules for sizes, levels, products, and combos—not individual flavors.</span></div><button className="red" onClick={addPricingCategory}>+ Pricing category</button></div>{pricingCategories.map(c=>{const rows=pricingOptions.filter(x=>x.pricing_category_id===c.id);return <section className="panel price-panel" key={c.id}><div className="option-title"><h3>{c.name}</h3><button onClick={()=>addPricingOption(c.id)}>+ Add price</button></div>{rows.length?rows.map(x=><div className="option-row" key={x.id}><input value={x.name} placeholder="Level 1 - 20oz" onChange={e=>updatePrice(x.id,{name:e.target.value})}/><label className="money-input">$<input type="number" min="0" step="0.01" value={x.price} onChange={e=>updatePrice(x.id,{price:Number(e.target.value)})}/></label><label className="available"><input type="checkbox" checked={x.is_available} onChange={e=>updatePrice(x.id,{is_available:e.target.checked})}/> Available</label><button className="red" disabled={saving} onClick={()=>savePricingOption(x)}>Save</button><button className="danger" onClick={()=>deletePricingOption(x)}>×</button></div>):<p className="muted">No prices yet. Add the first row.</p>}</section>})}</>}
      {tab==="addons"&&<><div className="section-head"><div><p className="eyebrow">CUSTOMIZATION</p><h2>Add-ins & boosts</h2><span>Manage optional extras and their prices.</span></div><button className="red" onClick={addAddon}>+ Add add-in</button></div><section className="panel">{addons.map(x=><div className="option-row" key={x.id}><input value={x.name} onChange={e=>updateAddon(x.id,{name:e.target.value})}/><label className="money-input">$<input type="number" min="0" step="0.01" value={x.price} onChange={e=>updateAddon(x.id,{price:Number(e.target.value)})}/></label><label className="available"><input type="checkbox" checked={x.is_available} onChange={e=>updateAddon(x.id,{is_available:e.target.checked})}/> Available</label><button className="red" onClick={()=>saveAddon(x)}>Save</button></div>)}</section></>}
      {tab==="specials"&&<><div className="section-head"><div><p className="eyebrow">SEASONAL & SPECIALS</p><h2>Reusable special menus</h2><span>Create monthly, seasonal, holiday, event, or limited-time menus and reuse them every year.</span></div><button className="red" onClick={addSpecialMenu}>+ Create special menu</button></div>{specialMenus.map(m=>{const rows=specialItems.filter(x=>x.special_menu_id===m.id);return <section className="panel special-panel" key={m.id}><div className="special-head"><input className="special-name" value={m.name} onChange={e=>updateSpecial(m.id,{name:e.target.value})}/><select value={m.menu_type} onChange={e=>updateSpecial(m.id,{menu_type:e.target.value})}><option value="monthly">Monthly</option><option value="seasonal">Seasonal</option><option value="holiday">Holiday</option><option value="event">Event</option><option value="special">Special</option></select><label><input type="checkbox" checked={m.is_active} onChange={e=>updateSpecial(m.id,{is_active:e.target.checked})}/> Active</label></div><div className="date-row"><label>Starts<input type="date" value={dateValue(m.starts_on)} onChange={e=>updateSpecial(m.id,{starts_on:e.target.value||null})}/></label><label>Ends<input type="date" value={dateValue(m.ends_on)} onChange={e=>updateSpecial(m.id,{ends_on:e.target.value||null})}/></label><label><input type="checkbox" checked={m.repeats_yearly} onChange={e=>updateSpecial(m.id,{repeats_yearly:e.target.checked})}/> Repeat yearly</label><button className="red" onClick={()=>saveSpecialMenu(m)}>Save menu</button><button className="danger" onClick={()=>deleteSpecialMenu(m)}>Delete</button></div><div className="special-items"><div className="option-title"><h4>Drinks in this menu</h4><button onClick={()=>addSpecialItem(m.id)}>+ Add drink</button></div>{rows.map(x=><div className="option-row" key={x.id}><input value={x.name} onChange={e=>updateSpecialItem(x.id,{name:e.target.value})}/><select value={x.menu_category_id||""} onChange={e=>updateSpecialItem(x.id,{menu_category_id:e.target.value||null})}><option value="">Choose menu type</option>{menuCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label className="available"><input type="checkbox" checked={x.is_available} onChange={e=>updateSpecialItem(x.id,{is_available:e.target.checked})}/> Available</label><button className="red" onClick={()=>saveSpecialItem(x)}>Save</button><button className="danger" onClick={()=>deleteSpecialItem(x)}>×</button></div>)}{!rows.length&&<p className="muted">No special drinks yet.</p>}</div></section>})}{!specialMenus.length&&!loading&&<section className="panel empty-state"><h3>No seasonal or special menus yet</h3><p>Create a monthly menu, holiday menu, or one-time event and keep it here for reuse.</p></section>}</>}
      {tab==="orders"&&<section className="panel"><h2>Orders</h2>{orders.length?orders.slice(0,30).map(o=><div className="rank" key={o.id}><span>{new Date(o.created_at).toLocaleString()} · {o.fulfillment||"pickup"} · {o.status}</span><b>{money(o.total)}</b></div>):<p className="muted">No orders yet.</p>}</section>}
    </div>
  </main>;
}
