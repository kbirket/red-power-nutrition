"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Group = { id:string; name:string };
type Option = { id:string; pricing_group_id:string; level:string|null; size:string|null; price:number; is_available:boolean; sort_order:number };
const money=(n:number)=>`$${Number(n||0).toFixed(2)}`;

export default function OwnerPrices(){
  const s=createClient();
  const [groups,setGroups]=useState<Group[]>([]);
  const [options,setOptions]=useState<Option[]>([]);
  const [editing,setEditing]=useState<string|null>(null);
  const [draft,setDraft]=useState<Record<string,Option>>({});
  const [newGroup,setNewGroup]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  const load=async()=>{
    setError(""); setMessage("");
    const [g,o]=await Promise.all([
      s.from("pricing_groups").select("id,name").order("name"),
      s.from("shared_pricing_options").select("id,pricing_group_id,level,size,price,is_available,sort_order").order("sort_order").order("level")
    ]);
    if(g.error||o.error){setError((g.error||o.error)?.message||"Could not load shared prices.");return;}
    setGroups(g.data||[]);
    setOptions((o.data||[]).map((x:any)=>({...x,price:Number(x.price)||0})));
  };
  useEffect(()=>{load()},[]);

  const addGroup=async()=>{
    const name=newGroup.trim(); if(!name)return;
    const {data,error}=await s.from("pricing_groups").insert({name}).select("id,name").single();
    if(error){setError(error.message);return;}
    setGroups(x=>[...x,data]); setNewGroup(""); setMessage(`${data.name} created.`);
  };

  const addOption=async(groupId:string)=>{
    const count=options.filter(x=>x.pricing_group_id===groupId).length;
    const {data,error}=await s.from("shared_pricing_options").insert({pricing_group_id:groupId,level:"New level",size:null,price:0,is_available:true,sort_order:count+1}).select().single();
    if(error){setError(error.message);return;}
    const row={...data,price:Number(data.price)||0};
    setOptions(x=>[...x,row]); setEditing(row.id); setDraft(d=>({...d,[row.id]:row}));
  };

  const start=(o:Option)=>{setDraft(d=>({...d,[o.id]:{...o}}));setEditing(o.id);};
  const cancel=()=>setEditing(null);
  const save=async(id:string)=>{
    const x=draft[id]; if(!x)return;
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

  return <main style={{maxWidth:980,margin:"0 auto",padding:24}}>
    <header style={{marginBottom:24}}>
      <p style={{letterSpacing:2,fontWeight:800,margin:0}}>PRICING CENTER</p>
      <h1 style={{margin:"6px 0"}}>Shared prices</h1>
      <p>Create pricing structures once. Drinks will attach to one of these structures.</p>
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        <input placeholder="New pricing group" value={newGroup} onChange={e=>setNewGroup(e.target.value)}/>
        <button onClick={addGroup}>+ Add pricing group</button>
        <button onClick={load}>↻ Refresh</button>
      </div>
    </header>
    {message&&<p style={{color:"green"}}>{message}</p>}
    {error&&<p style={{color:"crimson"}}>{error}</p>}
    {groups.map(group=>{
      const rows=options.filter(o=>o.pricing_group_id===group.id);
      return <section key={group.id} style={{border:"1px solid #ddd",borderRadius:16,padding:18,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div><h2 style={{margin:0}}>{group.name}</h2><small>Reusable pricing structure</small></div>
          <button onClick={()=>addOption(group.id)}>+ Add price</button>
        </div>
        {rows.length===0&&<p>No prices yet. Add the levels, sizes, and prices customers can choose.</p>}
        {rows.map(o=>{
          const open=editing===o.id; const x=open?draft[o.id]:o;
          return <div key={o.id} style={{display:"grid",gridTemplateColumns:"minmax(130px,1fr) minmax(110px,1fr) 100px 120px 170px",gap:8,alignItems:"center",padding:"10px 0",borderTop:"1px solid #eee",marginTop:8}}>
            {open?<input placeholder="Level / option" value={x.level||""} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,level:e.target.value}}))}/>:<strong>{o.level||"Option"}</strong>}
            {open?<input placeholder="Size (optional)" value={x.size||""} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,size:e.target.value}}))}/>:<span>{o.size||"One price"}</span>}
            {open?<input type="number" step="0.01" value={x.price} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,price:Number(e.target.value)}}))}/>:<b>{money(o.price)}</b>}
            <label><input type="checkbox" disabled={!open} checked={x.is_available} onChange={e=>setDraft(d=>({...d,[o.id]:{...x,is_available:e.target.checked}}))}/> Available</label>
            {open?<span style={{display:"flex",gap:6}}><button onClick={()=>save(o.id)}>Save</button><button onClick={cancel}>Cancel</button></span>:<span style={{display:"flex",gap:6}}><button onClick={()=>start(o)}>Edit</button><button onClick={()=>remove(o.id)}>×</button></span>}
          </div>
        })}
      </section>
    })}
  </main>;
}
