"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Group={id:string;name:string};
type Option={id:string;pricing_group_id:string;level:string|null;size:string|null;price:number;is_available:boolean;sort_order:number};
type Drink={id:string;name:string;pricing_group_id:string|null;category:string};
const money=(n:number)=>`$${Number(n||0).toFixed(2)}`;

export default function OwnerPrices(){
 const s=createClient();
 const [groups,setGroups]=useState<Group[]>([]);
 const [options,setOptions]=useState<Option[]>([]);
 const [drinks,setDrinks]=useState<Drink[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState<Record<string,Option>>({});
 const [newGroup,setNewGroup]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 const load=async()=>{
  setError("");setMessage("");
  const [g,o,m]=await Promise.all([
   s.from("pricing_groups").select("id,name").order("name"),
   s.from("shared_pricing_options").select("id,pricing_group_id,level,size,price,is_available,sort_order").order("sort_order").order("level"),
   s.from("menu_items").select("id,name,pricing_group_id,menu_categories(name)").eq("is_available",true).order("name")
  ]);
  const bad=g.error||o.error||m.error;
  if(bad){setError(bad.message);return;}
  setGroups(g.data||[]);
  setOptions((o.data||[]).map((x:any)=>({...x,price:Number(x.price)||0})));
  setDrinks((m.data||[]).map((x:any)=>({id:x.id,name:x.name,pricing_group_id:x.pricing_group_id,category:x.menu_categories?.name||"Drink"})));
 };
 useEffect(()=>{load()},[]);

 const addGroup=async()=>{
  const name=newGroup.trim();if(!name)return;
  const {data,error}=await s.from("pricing_groups").insert({name}).select("id,name").single();
  if(error){setError(error.message);return;}
  setGroups(x=>[...x,data]);setNewGroup("");setMessage(`${data.name} created. Now add its levels, sizes, and prices.`);
 };
 const addOption=async(groupId:string)=>{
  const count=options.filter(x=>x.pricing_group_id===groupId).length;
  const {data,error}=await s.from("shared_pricing_options").insert({pricing_group_id:groupId,level:"New level",size:null,price:0,is_available:true,sort_order:count+1}).select().single();
  if(error){setError(error.message);return;}
  const row={...data,price:Number(data.price)||0};setOptions(x=>[...x,row]);setEditing(row.id);setDraft(d=>({...d,[row.id]:row}));
 };
 const start=(o:Option)=>{setDraft(d=>({...d,[o.id]:{...o}}));setEditing(o.id)};
 const cancel=()=>setEditing(null);
 const save=async(id:string)=>{
  const x=draft[id];if(!x)return;
  const row={level:x.level?.trim()||null,size:x.size?.trim()||null,price:Number(x.price)||0,is_available:x.is_available,sort_order:Number(x.sort_order)||0};
  const {error}=await s.from("shared_pricing_options").update(row).eq("id",id);
  if(error){setError(error.message);return;}
  setOptions(os=>os.map(o=>o.id===id?{...o,...row}:o));setEditing(null);setMessage("Price saved.");
 };
 const remove=async(id:string)=>{
  if(!confirm("Remove this price?"))return;
  const {error}=await s.from("shared_pricing_options").delete().eq("id",id);
  if(error){setError(error.message);return;}
  setOptions(x=>x.filter(o=>o.id!==id));setMessage("Price removed.");
 };
 const assignDrink=async(drinkId:string,groupId:string|null)=>{
  const {error}=await s.from("menu_items").update({pricing_group_id:groupId}).eq("id",drinkId);
  if(error){setError(error.message);return;}
  setDrinks(ds=>ds.map(d=>d.id===drinkId?{...d,pricing_group_id:groupId}:d));
  const drink=drinks.find(d=>d.id===drinkId);
  const group=groups.find(g=>g.id===groupId);
  setMessage(group?`${drink?.name||"Drink"} now uses ${group.name}.`:`${drink?.name||"Drink"} was unlinked from pricing.`);
 };
 const unassigned=drinks.filter(d=>!d.pricing_group_id);

 return <main style={{maxWidth:1040,margin:"0 auto",padding:24}}>
  <header style={{marginBottom:24}}>
   <p style={{letterSpacing:2,fontWeight:800,margin:0}}>PRICING CENTER</p>
   <h1 style={{margin:"6px 0"}}>Levels, sizes & prices</h1>
   <p style={{maxWidth:760}}>Build each pricing structure once, then attach drinks to it here. A drink does not carry its own prices.</p>
   <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
    <input placeholder="New pricing group" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
    <button onClick={addGroup}>+ Add pricing group</button>
    <button onClick={load}>↻ Refresh</button>
   </div>
  </header>
  {message&&<p style={{color:"green"}}>{message}</p>}
  {error&&<p style={{color:"crimson"}}>{error}</p>}
  {unassigned.length>0&&<section style={{border:"1px solid #e3b6b6",borderRadius:16,padding:18,marginBottom:16}}>
   <h2 style={{marginTop:0}}>Drinks needing a pricing group</h2>
   <p>Choose the shared pricing structure for each drink.</p>
   {unassigned.map(d=><div key={d.id} style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid #eee",flexWrap:"wrap"}}><span><strong>{d.category} · {d.name}</strong></span><select value="" onChange={e=>assignDrink(d.id,e.target.value||null)}><option value="">Attach to pricing group…</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>)}
  </section>}
  {groups.map(group=>{
   const rows=options.filter(o=>o.pricing_group_id===group.id);
   const attached=drinks.filter(d=>d.pricing_group_id===group.id);
   return <section key={group.id} style={{border:"1px solid #ddd",borderRadius:16,padding:18,marginBottom:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
     <div><h2 style={{margin:0}}>{group.name}</h2><small>Shared pricing structure</small></div>
     <button onClick={()=>addOption(group.id)}>+ Add price</button>
    </div>
    <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid #eee"}}>
     <strong>Drinks using this pricing</strong>
     {attached.length===0?<p style={{marginBottom:0}}>No drinks attached yet. Attach drinks below.</p>:attached.map(d=><div key={d.id} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderTop:"1px solid #f0f0f0",marginTop:6,flexWrap:"wrap"}}><span>{d.category} · <strong>{d.name}</strong></span><select value={group.id} onChange={e=>assignDrink(d.id,e.target.value||null)}><option value="">No pricing group</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>)}
     {unassigned.length>0&&<select defaultValue="" style={{marginTop:10}} onChange={e=>{if(e.target.value)assignDrink(e.target.value,group.id)}}><option value="">+ Attach another drink…</option>{unassigned.map(d=><option key={d.id} value={d.id}>{d.category} · {d.name}</option>)}</select>}
    </div>
    <div style={{marginTop:18}}>
     <strong>Levels, sizes & prices</strong>
     {rows.length===0&&<p>No prices yet. Add the levels, sizes, and prices customers can choose.</p>}
     {rows.map(o=>{const open=editing===o.id;const x=open?draft[o.id]:o;return <div key={o.id} style={{display:"grid",gridTemplateColumns:"minmax(130px,1fr) minmax(110px,1fr) 100px 120px 170px",gap:8,alignItems:"center",padding:"10px 0",borderTop:"1px solid #eee",marginTop:8}}>
      {open?<input placeholder="Level / option" value={x.level||""} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,level:e.target.value}}))}/>:<strong>{o.level||"Option"}</strong>}
      {open?<input placeholder="Size (optional)" value={x.size||""} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,size:e.target.value}}))}/>:<span>{o.size||"One price"}</span>}
      {open?<input type="number" step="0.01" value={x.price} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,price:Number(e.target.value)}}))}/>:<b>{money(o.price)}</b>}
      <label><input type="checkbox" disabled={!open} checked={x.is_available} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,is_available:e.target.checked}}))}/> Available</label>
      {open?<span style={{display:"flex",gap:6}}><button onClick={()=>save(o.id)}>Save</button><button onClick={cancel}>Cancel</button></span>:<span style={{display:"flex",gap:6}}><button onClick={()=>start(o)}>Edit</button><button onClick={()=>remove(o.id)}>×</button></span>}
     </div>})}
    </div>
    <button style={{marginTop:14}} onClick={()=>addOption(group.id)}>+ Add another price</button>
   </section>
  })}
 </main>;
}
