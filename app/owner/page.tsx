"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab="dashboard"|"menu"|"prices"|"addons"|"specials"|"orders";
type Cat={id:string;name:string;sort_order:number}; type Item={id:string;category_id:string|null;name:string;is_available:boolean}; type Flavor={id:string;menu_item_id:string;name:string;is_available:boolean;sort_order:number}; type PriceCat={id:string;name:string;sort_order:number}; type Price={id:string;pricing_category_id:string;name:string;price:number;is_available:boolean;sort_order:number}; type Addon={id:string;name:string;price:number;is_available:boolean}; type Special={id:string;name:string;menu_type:string;starts_on:string|null;ends_on:string|null;repeats_yearly:boolean;is_active:boolean}; type SpecialItem={id:string;special_menu_id:string;menu_item_id?:string|null;name:string;description:string|null;is_available:boolean;sort_order:number}; type Order={id:string;created_at:string;total:number;status:string;fulfillment:string|null};
const money=(n:number)=>`$${Number(n||0).toFixed(2)}`;
export default function OwnerPage(){const s=createClient();const [tab,setTab]=useState<Tab>("dashboard");const [cats,setCats]=useState<Cat[]>([]);const [items,setItems]=useState<Item[]>([]);const [flavors,setFlavors]=useState<Flavor[]>([]);const [priceCats,setPriceCats]=useState<PriceCat[]>([]);const [prices,setPrices]=useState<Price[]>([]);const [addons,setAddons]=useState<Addon[]>([]);const [specials,setSpecials]=useState<Special[]>([]);const [specialItems,setSpecialItems]=useState<SpecialItem[]>([]);const [orders,setOrders]=useState<Order[]>([]);const [editing,setEditing]=useState<Record<string,any>>({});const [saved,setSaved]=useState<Record<string,any>>({});const [message,setMessage]=useState("");const [error,setError]=useState("");
const load=async()=>{setError("");const [a,b,c,d,e,f,g,h,i]=await Promise.all([s.from("menu_categories").select("id,name,sort_order").order("sort_order"),s.from("menu_items").select("id,category_id,name,is_available").order("name"),s.from("menu_item_flavors").select("id,menu_item_id,name,is_available,sort_order").order("sort_order"),s.from("pricing_categories").select("id,name,sort_order").order("sort_order"),s.from("pricing_options").select("id,pricing_category_id,name,price,is_available,sort_order").order("sort_order"),s.from("addons").select("id,name,price,is_available").order("name"),s.from("special_menus").select("id,name,menu_type,starts_on,ends_on,repeats_yearly,is_active").order("starts_on"),s.from("orders").select("id,created_at,total,status,fulfillment").order("created_at",{ascending:false}),s.from("special_menu_items").select("id,special_menu_id,menu_item_id,name,description,is_available,sort_order").order("sort_order")]);const bad=[a,b,c,d,e,f,g,h,i].find(x=>x.error);if(bad){setError(bad.error!.message);return;}setCats(a.data||[]);setItems(b.data||[]);setFlavors(c.data||[]);setPriceCats(d.data||[]);setPrices((e.data||[]).map((x:any)=>({...x,price:+x.price||0})));setAddons((f.data||[]).map((x:any)=>({...x,price:+x.price||0})));setSpecials(g.data||[]);setOrders((h.data||[]).map((x:any)=>({...x,total:+x.total||0})));setSpecialItems(i.data||[])};useEffect(()=>{load()},[]);
const edit=(k:string,v:any)=>{setSaved(x=>x[k]??({...x,[k]:structuredClone(v)}));setEditing(x=>({...x,[k]:true}))};const cancel=(k:string,setter:any,id:string)=>{if(saved[k])setter((xs:any[])=>xs.map(x=>x.id===id?saved[k]:x));setEditing(x=>({...x,[k]:false}));setSaved(({[k]:_,...rest})=>rest)};const lock=(k:string)=>{setEditing(x=>({...x,[k]:false}));setSaved(({[k]:_,...rest})=>rest)};const patch=(setter:any,id:string,p:any)=>setter((xs:any[])=>xs.map(x=>x.id===id?{...x,...p}:x));const save=async(table:string,x:any,fields:string[],k:string)=>{const body=Object.fromEntries(fields.map(f=>[f,f==="price"?Number(x[f])||0:x[f]]));const {error}=await s.from(table).update(body).eq("id",x.id);if(error)return setError(error.message);lock(k);setMessage(`${x.name} saved.`)};
const addItem=async(cat:string)=>{const {data,error}=await s.from("menu_items").insert({category_id:cat,name:"New drink",price:0,is_available:true}).select("id,category_id,name,is_available").single();if(error)setError(error.message);else if(data){setItems(x=>[...x,data]);edit(`item-${data.id}`,data)}};const addFlavor=async(item:string)=>{const n=flavors.filter(x=>x.menu_item_id===item).length;const {data,error}=await s.from("menu_item_flavors").insert({menu_item_id:item,name:"New flavor",is_available:true,sort_order:n+1}).select("id,menu_item_id,name,is_available,sort_order").single();if(error)setError(error.message);else if(data){setFlavors(x=>[...x,data]);edit(`flavor-${data.id}`,data)}};const addPrice=async(cat:string)=>{const n=prices.filter(x=>x.pricing_category_id===cat).length;const {data,error}=await s.from("pricing_options").insert({pricing_category_id:cat,name:"New price",price:0,is_available:true,sort_order:n+1}).select("id,pricing_category_id,name,price,is_available,sort_order").single();if(error)setError(error.message);else if(data){const row={...data,price:+data.price||0};setPrices(x=>[...x,row]);edit(`price-${row.id}`,row)}};const addAddon=async()=>{const {data,error}=await s.from("addons").insert({name:"New add-in",price:0,is_available:true}).select("id,name,price,is_available").single();if(error)setError(error.message);else if(data){const row={...data,price:+data.price||0};setAddons(x=>[...x,row]);edit(`addon-${row.id}`,row)}};const addPriceCat=async()=>{const name=prompt("Pricing category name");if(!name)return;const {data,error}=await s.from("pricing_categories").insert({name,sort_order:priceCats.length+1}).select("id,name,sort_order").single();if(error)setError(error.message);else if(data)setPriceCats(x=>[...x,data])};const addSpecial=async()=>{const {data,error}=await s.from("special_menus").insert({name:"New special menu",menu_type:"monthly",is_active:false,repeats_yearly:false}).select("id,name,menu_type,starts_on,ends_on,repeats_yearly,is_active").single();if(error)setError(error.message);else if(data){setSpecials(x=>[...x,data]);edit(`special-${data.id}`,data)}};const addSpecialItem=async(menu:string)=>{const n=specialItems.filter(x=>x.special_menu_id===menu).length;const {data,error}=await s.from("special_menu_items").insert({special_menu_id:menu,menu_item_id:null,name:"New special drink",description:null,is_available:true,sort_order:n+1}).select("id,special_menu_id,menu_item_id,name,description,is_available,sort_order").single();if(error)setError(error.message);else if(data){setSpecialItems(x=>[...x,data]);edit(`special-item-${data.id}`,data)}};
const addExistingSpecialItem=async(menu:string,itemId:string)=>{if(!itemId)return;const exists=specialItems.some(x=>x.special_menu_id===menu&&x.menu_item_id===itemId);if(exists){setError("That regular drink is already in this special menu.");return;}const item=items.find(x=>x.id===itemId);if(!item)return;const n=specialItems.filter(x=>x.special_menu_id===menu).length;const {data,error}=await s.from("special_menu_items").insert({special_menu_id:menu,menu_item_id:itemId,name:item.name,description:null,is_available:true,sort_order:n+1}).select("id,special_menu_id,menu_item_id,name,description,is_available,sort_order").single();if(error)setError(error.message);else if(data){setSpecialItems(x=>[...x,data]);setMessage(`${item.name} added to the special menu.`)}};const completed=orders.filter(x=>x.status==="completed"),revenue=completed.reduce((n,x)=>n+x.total,0);const tabs:[Tab,string][]=[["dashboard","📊 Dashboard"],["menu","🍹 Manage Menu"],["prices","💲 Prices"],["addons","➕ Add-Ins"],["specials","🌟 Seasonal & Specials"],["orders","📦 Orders"]];const row=(x:any,k:string,setter:any,table:string,fields:string[],moneyField=false)=>{const open=editing[k];return <div className={`option-row ${open?"editing":"locked"}`} key={x.id}><input disabled={!open} value={x.name} onChange={e=>patch(setter,x.id,{name:e.target.value})}/>{moneyField&&<label className="money-input">$<input disabled={!open} type="number" step=".01" value={x.price} onChange={e=>patch(setter,x.id,{price:+e.target.value})}/></label>}<label className="available"><input disabled={!open} type="checkbox" checked={x.is_available} onChange={e=>patch(setter,x.id,{is_available:e.target.checked})}/> Available</label>{open?<><button className="red" onClick={()=>save(table,x,fields,k)}>Save</button><button onClick={()=>cancel(k,setter,x.id)}>Cancel</button></>:<button onClick={()=>edit(k,x)}>✏ Edit</button>}</div>};
return <main className="owner-shell"><header className="owner-hero"><img src="/red-power-logo.png" alt="Red Power Nutrition"/><div><p>OWNER PORTAL</p><h1>CONTROL YOUR POWER.</h1><span>Manage the menu, shared prices, special menus, orders, and sales.</span></div><button onClick={load}>↻ Refresh</button></header><nav className="owner-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}</nav><div className="owner-content">{message&&<div className="notice success">✓ {message}</div>}{error&&<div className="notice error">⚠ {error}</div>}{tab==="dashboard"&&<section className="cards"><article><small>Completed revenue</small><strong>{money(revenue)}</strong></article><article><small>Completed orders</small><strong>{completed.length}</strong></article><article><small>Average order</small><strong>{money(completed.length?revenue/completed.length:0)}</strong></article><article><small>New orders</small><strong>{orders.filter(x=>x.status==="new").length}</strong></article></section>}{tab==="menu"&&<><div className="section-head"><div><p className="eyebrow">REGULAR MENU</p><h2>Manage the menu</h2><span>Each drink can have its own flavors underneath it. Prices stay in the Prices tab.</span></div></div>{cats.filter(c=>c.name.toLowerCase()!=="seasonal").map(c=><section className="panel" key={c.id}><div className="option-title"><h3>{c.name}</h3><button onClick={()=>addItem(c.id)}>+ Add drink</button></div>{items.filter(x=>x.category_id===c.id).map(x=>{const k=`item-${x.id}`,open=editing[k];return <div className="menu-card" key={x.id}><div className={`option-row ${open?"editing":"locked"}`}><input disabled={!open} value={x.name} onChange={e=>patch(setItems,x.id,{name:e.target.value})}/><label className="available"><input disabled={!open} type="checkbox" checked={x.is_available} onChange={e=>patch(setItems,x.id,{is_available:e.target.checked})}/> Available</label>{open?<><button className="red" onClick={()=>save("menu_items",x,["name","is_available"],k)}>Save</button><button onClick={()=>cancel(k,setItems,x.id)}>Cancel</button></>:<button onClick={()=>edit(k,x)}>✏ Edit</button>}</div><div className="flavor-section"><div className="option-title"><h4>Flavors</h4><button onClick={()=>addFlavor(x.id)}>+ Add flavor</button></div>{flavors.filter(f=>f.menu_item_id===x.id).map(f=>row(f,`flavor-${f.id}`,setFlavors,"menu_item_flavors",["name","is_available"],false))}{!flavors.some(f=>f.menu_item_id===x.id)&&<p className="muted">No flavors yet.</p>}</div></div>})}</section>)}</>}{tab==="prices"&&<><div className="section-head"><div><p className="eyebrow">PRICING CENTER</p><h2>Manage prices</h2><span>Shared sizes, levels, products, and combos—not flavors.</span></div><button className="red" onClick={addPriceCat}>+ Pricing category</button></div>{priceCats.map(c=><section className="panel" key={c.id}><div className="option-title"><h3>{c.name}</h3></div>{prices.filter(x=>x.pricing_category_id===c.id).map(x=>row(x,`price-${x.id}`,setPrices,"pricing_options",["name","price","is_available","sort_order"],true))}<button className="add-bottom" onClick={()=>addPrice(c.id)}>＋ Add another price</button></section>)}</>}{tab==="addons"&&<><div className="section-head"><div><p className="eyebrow">CUSTOMIZATION</p><h2>Add-ins & boosts</h2></div><button className="red" onClick={addAddon}>+ Add add-in</button></div><section className="panel">{addons.map(x=>row(x,`addon-${x.id}`,setAddons,"addons",["name","price","is_available"],true))}</section></>}{tab==="specials"&&<>
<div className="section-head">
  <div>
    <p className="eyebrow">SEASONAL & SPECIALS</p>
    <h2>Reusable special menus</h2>
    <span>Monthly, holiday, event, or limited-time menus—with their own drinks.</span>
  </div>
  <button className="red" onClick={addSpecial}>+ Create special menu</button>
</div>

{specials.map((x) => {
  const k = `special-${x.id}`;
  const open = editing[k];

  return (
    <section className={`panel ${open ? "editing" : "locked"}`} key={x.id}>
      <input
        disabled={!open}
        className="special-name"
        value={x.name}
        onChange={(e) => patch(setSpecials, x.id, { name: e.target.value })}
      />

      <select
        disabled={!open}
        value={x.menu_type}
        onChange={(e) => patch(setSpecials, x.id, { menu_type: e.target.value })}
      >
        <option value="monthly">Monthly</option>
        <option value="seasonal">Seasonal</option>
        <option value="holiday">Holiday</option>
        <option value="event">Event</option>
      </select>

      <div className="date-row">
        <label>
          Starts
          <input
            disabled={!open}
            type="date"
            value={x.starts_on?.slice(0, 10) || ""}
            onChange={(e) =>
              patch(setSpecials, x.id, { starts_on: e.target.value || null })
            }
          />
        </label>

        <label>
          Ends
          <input
            disabled={!open}
            type="date"
            value={x.ends_on?.slice(0, 10) || ""}
            onChange={(e) =>
              patch(setSpecials, x.id, { ends_on: e.target.value || null })
            }
          />
        </label>

        <label>
          <input
            disabled={!open}
            type="checkbox"
            checked={x.repeats_yearly}
            onChange={(e) =>
              patch(setSpecials, x.id, { repeats_yearly: e.target.checked })
            }
          />
          Repeat yearly
        </label>

        <label>
          <input
            disabled={!open}
            type="checkbox"
            checked={x.is_active}
            onChange={(e) =>
              patch(setSpecials, x.id, { is_active: e.target.checked })
            }
          />
          Active
        </label>

        {open ? (
          <>
            <button
              className="red"
              onClick={() =>
                save(
                  "special_menus",
                  x,
                  [
                    "name",
                    "menu_type",
                    "starts_on",
                    "ends_on",
                    "repeats_yearly",
                    "is_active",
                  ],
                  k
                )
              }
            >
              Save
            </button>
            <button onClick={() => cancel(k, setSpecials, x.id)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => edit(k, x)}>✏ Edit</button>
        )}
      </div>

      <div className="special-drinks">
        <div className="option-title">
          <div>
            <h3>Drinks in this menu</h3>
            <p className="muted">
              Add the temporary drinks customers should see for this special.
            </p>
          </div>

          <div className="special-add-actions">
            <button onClick={() => addSpecialItem(x.id)}>+ Create new drink</button>
            <select defaultValue="" onChange={(e) => { addExistingSpecialItem(x.id, e.target.value); e.currentTarget.value = ""; }}>
              <option value="" disabled>+ Add from regular menu</option>
              {items.filter((item) => !specialItems.some((d) => d.special_menu_id === x.id && d.menu_item_id === item.id)).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        {specialItems
          .filter((d) => d.special_menu_id === x.id)
          .map((d) => {
            const dk = `special-item-${d.id}`;
            const dopen = editing[dk];

            return (
              <div
                className={`special-drink ${dopen ? "editing" : "locked"}`}
                key={d.id}
              >
                <input
                  disabled={!dopen}
                  value={d.name}
                  onChange={(e) =>
                    patch(setSpecialItems, d.id, { name: e.target.value })
                  }
                />

                <input
                  disabled={!dopen}
                  placeholder="Optional description"
                  value={d.description || ""}
                  onChange={(e) =>
                    patch(setSpecialItems, d.id, {
                      description: e.target.value || null,
                    })
                  }
                />

                <label className="available">
                  <input
                    disabled={!dopen}
                    type="checkbox"
                    checked={d.is_available}
                    onChange={(e) =>
                      patch(setSpecialItems, d.id, {
                        is_available: e.target.checked,
                      })
                    }
                  />
                  Available
                </label>

                {dopen ? (
                  <>
                    <button
                      className="red"
                      onClick={() =>
                        save(
                          "special_menu_items",
                          d,
                          [
                            "name",
                            "description",
                            "is_available",
                            "sort_order",
                          ],
                          dk
                        )
                      }
                    >
                      Save
                    </button>

                    <button
                      onClick={() =>
                        cancel(dk, setSpecialItems, d.id)
                      }
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => edit(dk, d)}>✏ Edit</button>
                )}
              </div>
            );
          })}

        {!specialItems.some((d) => d.special_menu_id === x.id) && (
          <p className="muted empty-drinks">
            No drinks added yet. Use “+ Add drink” to build this menu.
          </p>
        )}
      </div>
    </section>
  );
})}
</>}
{tab==="orders"&&<section className="panel"><h2>Orders</h2>{orders.map(x=><div className="rank" key={x.id}><span>{new Date(x.created_at).toLocaleString()} · {x.fulfillment||"pickup"} · {x.status}</span><b>{money(x.total)}</b></div>)}</section>}</div><style jsx>{`.locked{opacity:.62;background:rgba(255,255,255,.45)}.locked input,.locked select{cursor:not-allowed}.editing{opacity:1}.option-row,.special-drink{display:flex;gap:10px;align-items:center;padding:10px;border-radius:12px;margin:7px 0}.option-row>input{flex:1}.special-drink input{flex:1;min-width:120px}.option-row input,.option-row select,select{min-width:0}.menu-card{padding:12px 0;border-top:1px solid rgba(0,0,0,.08)}.flavor-section,.special-drinks{margin:4px 0 0 22px;padding:10px 12px;border-left:3px solid rgba(190,45,35,.35)}.flavor-section h4,.special-drinks h3{margin:0}.special-drinks{margin-left:0;border-left:0;border-top:1px solid rgba(0,0,0,.08);padding:18px 0 0}.special-name{font-weight:700;font-size:18px;margin:0 10px 10px 0}.date-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:10px}.date-row label{display:flex;gap:6px;align-items:center}.add-bottom{display:block;margin:16px auto 2px;min-width:220px}.empty-drinks{padding:10px 0}.muted{opacity:.65}.special-add-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.special-add-actions select{min-height:40px;padding:0 10px;border-radius:10px;border:1px solid rgba(0,0,0,.15);background:white}@media(max-width:700px){.option-row,.special-drink{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px}.option-row>input,.special-drink input:first-child,.special-drink input:nth-child(2){grid-column:1/-1;width:100%;min-height:44px}.money-input{grid-column:1/2;min-height:44px}.available{grid-column:2/3;align-self:center}.option-row button,.special-drink button{min-height:44px;width:100%}.add-bottom{width:100%;min-height:48px;margin-top:18px}.special-add-actions{width:100%}.special-add-actions button,.special-add-actions select{width:100%;min-height:44px}.panel{padding-left:12px;padding-right:12px}.section-head{gap:12px}.section-head .red{white-space:nowrap}.date-row label{width:100%;justify-content:space-between}.date-row label input[type=date]{max-width:62%}.special-drinks .option-title{align-items:flex-start}.special-drinks .option-title button{flex:none}}`}</style></main>}
