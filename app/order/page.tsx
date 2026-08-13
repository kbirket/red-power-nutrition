"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Drink = { id?: string; name: string; price: number; description?: string; category: "tea" | "shake" };
type Addon = { id?: string; name: string; price: number };
type CartItem = Drink & { cartId: string; addons: Addon[] };

const fallbackTeas: Drink[] = [
  "Airhead Extreme","Autumn Gold","Bahama Mama","Baja Blast","Bikini Bottom","Blackberry Lemonade","Candy Apple","Cat in the Hat","Cotton Candy","Farmer’s Daughter","Freddy","Gummy Worm","Hocus Pocus","Hurricane","Jelly Bean","Kansas Sunset","Krazie Kelcie","Mahomes","Nerds","Pineapple Sunrise","Pink Drink","Tropic Like It’s Hot","Watermelon Crawl"
].map(name => ({ name, price: 8.5, category: "tea" }));

const fallbackShakes: Drink[] = [
  "Dunkaroo","Moon Pie","Nutty Buddy","Oatmeal Cream Pie","PB & J","Rice Krispy Treat","Zebra Cake","Honeybun"
].map(name => ({ name, price: 9, category: "shake" }));

const fallbackAddons: Addon[] = [
  { name: "Beauty Boost", price: 1 },
  { name: "Energy Boost", price: 1 },
  { name: "Protein Boost", price: 1.5 },
  { name: "Immunity Boost", price: 1 },
  { name: "Hydration Boost", price: 0.75 }
];

function money(value: number) { return `$${value.toFixed(2)}`; }

function nextFridayDelivery() {
  const now = new Date();
  const central = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = Object.fromEntries(central.formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = days[parts.weekday] ?? 0;
  let add = (5 - day + 7) % 7;
  const hour = Number(parts.hour); const minute = Number(parts.minute);
  if (add === 0 && (hour > 8 || (hour === 8 && minute >= 30))) add = 7;
  const target = new Date(now.getTime() + add * 86400000);
  return target.toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" });
}

export default function OrderPage() {
  const [teas, setTeas] = useState<Drink[]>(fallbackTeas);
  const [shakes, setShakes] = useState<Drink[]>(fallbackShakes);
  const [addons, setAddons] = useState<Addon[]>(fallbackAddons);
  const [selected, setSelected] = useState<Drink | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<"pickup" | "school_delivery">("pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [teacher, setTeacher] = useState("");
  const [notes, setNotes] = useState("");
  const [schoolScheduleId, setSchoolScheduleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: menu }, { data: addonRows }, { data: schedules }] = await Promise.all([
        supabase.from("menu_items").select("id,name,price,description,menu_categories(name)").eq("is_available", true),
        supabase.from("addons").select("id,name,price").eq("is_available", true),
        supabase.from("school_schedules").select("id").eq("school_name", "Argonia").eq("active", true).limit(1)
      ]);
      if (menu?.length) {
        const loaded = menu.map((item: any) => ({ id: item.id, name: item.name, price: Number(item.price), description: item.description, category: item.menu_categories?.name === "Protein Shakes" ? "shake" : "tea" }));
        setTeas(loaded.filter(i => i.category === "tea")); setShakes(loaded.filter(i => i.category === "shake"));
      }
      if (addonRows?.length) setAddons(addonRows.map((a: any) => ({ id: a.id, name: a.name, price: Number(a.price) })));
      if (schedules?.[0]) setSchoolScheduleId(schedules[0].id);
    }
    load();
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price + item.addons.reduce((a, x) => a + x.price, 0), 0), [cart]);
  const modalTotal = selected ? selected.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0) : 0;

  function toggleAddon(addon: Addon) {
    setSelectedAddons(current => current.some(a => a.name === addon.name) ? current.filter(a => a.name !== addon.name) : [...current, addon]);
  }
  function addToCart() {
    if (!selected) return;
    setCart(current => [...current, { ...selected, cartId: crypto.randomUUID(), addons: selectedAddons }]);
    setSelected(null); setSelectedAddons([]);
  }

  async function submitOrder() {
    setError(null); setSuccess(null);
    if (!name.trim() || cart.length === 0) { setError("Please enter your name and add at least one drink."); return; }
    if (fulfillment === "school_delivery" && !teacher.trim()) { setError("Please enter the teacher, classroom, or delivery location."); return; }
    setSubmitting(true);
    const supabase = createClient();
    const deliveryNote = fulfillment === "school_delivery" ? `Argonia Friday delivery • ${teacher.trim()} • Delivery window 9:30–10:00 AM${notes.trim() ? ` • ${notes.trim()}` : ""}` : notes.trim() || null;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      customer_name: name.trim(), customer_phone: phone.trim() || null, status: "new", fulfillment,
      school_schedule_id: fulfillment === "school_delivery" ? schoolScheduleId : null,
      subtotal, total: subtotal, notes: deliveryNote
    }).select("id,order_number").single();
    if (orderError || !order) { setError(orderError?.message || "We couldn't save your order. Please try again."); setSubmitting(false); return; }
    const itemRows = cart.map(item => ({ order_id: order.id, menu_item_id: item.id || null, item_name: item.name, unit_price: item.price, quantity: 1 }));
    const { data: savedItems, error: itemError } = await supabase.from("order_items").insert(itemRows).select("id");
    if (itemError || !savedItems) { setError(itemError?.message || "Your order was created, but items could not be saved."); setSubmitting(false); return; }
    const addonRows = cart.flatMap((item, index) => item.addons.map(addon => ({ order_item_id: savedItems[index].id, addon_id: addon.id || null, addon_name: addon.name, addon_price: addon.price })));
    if (addonRows.length) await supabase.from("order_item_addons").insert(addonRows);
    setSuccess(`Order #${order.order_number} is in! Staff will see it as NEW.`); setCart([]); setName(""); setPhone(""); setTeacher(""); setNotes(""); setSubmitting(false);
  }

  return <main className="page order-page">
    <header className="order-header"><div><p className="eyebrow">RED POWER NUTRITION</p><h1>Order your power.</h1><p>Choose your drink, customize it, and we’ll take it from there.</p></div><div className="cart-badge">🛒 {cart.length} {cart.length === 1 ? "drink" : "drinks"}</div></header>
    <section className="school-banner"><strong>🏫 Argonia Fridays</strong><span>Order by 8:30 AM • Delivery 9:30–10:00 AM • Next available: {nextFridayDelivery()}</span></section>
    <div className="order-layout"><div>
      <section><div className="section-title"><h2>🧋 Loaded Teas</h2><span>{teas.length} flavors</span></div><div className="drink-grid">{teas.map(drink => <button className="drink-card" key={drink.id || drink.name} onClick={() => { setSelected(drink); setSelectedAddons([]); }}><strong>{drink.name}</strong><span>{drink.description || "Loaded tea"}</span><b>{money(drink.price)}</b><small>Customize +</small></button>)}</div></section>
      <section><div className="section-title"><h2>🥤 Protein Shakes</h2><span>{shakes.length} flavors</span></div><div className="drink-grid">{shakes.map(drink => <button className="drink-card" key={drink.id || drink.name} onClick={() => { setSelected(drink); setSelectedAddons([]); }}><strong>{drink.name}</strong><span>{drink.description || "Protein shake"}</span><b>{money(drink.price)}</b><small>Customize +</small></button>)}</div></section>
    </div>
    <aside className="checkout panel"><div className="checkout-head"><div><p className="eyebrow">YOUR ORDER</p><h2>{cart.length ? `${cart.length} drink${cart.length === 1 ? "" : "s"}` : "Your cart is empty"}</h2></div><strong>{money(subtotal)}</strong></div>
      {cart.map(item => <div className="cart-item" key={item.cartId}><div><strong>{item.name}</strong>{item.addons.length > 0 && <small>{item.addons.map(a => a.name).join(" • ")}</small>}</div><div><b>{money(item.price + item.addons.reduce((sum, a) => sum + a.price, 0))}</b><button onClick={() => setCart(c => c.filter(x => x.cartId !== item.cartId))}>×</button></div></div>)}
      <div className="fulfillment"><button className={fulfillment === "pickup" ? "active" : ""} onClick={() => setFulfillment("pickup")}>🏪 Pickup</button><button className={fulfillment === "school_delivery" ? "active" : ""} onClick={() => setFulfillment("school_delivery")}>🏫 Argonia Friday</button></div>
      <div className="checkout-fields"><input placeholder="Your name *" value={name} onChange={e => setName(e.target.value)} /><input placeholder="Phone number (optional)" value={phone} onChange={e => setPhone(e.target.value)} />{fulfillment === "school_delivery" && <input placeholder="Teacher / classroom / delivery location *" value={teacher} onChange={e => setTeacher(e.target.value)} />}<textarea placeholder="Order notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      {error && <p className="form-error">{error}</p>}{success && <p className="form-success">{success}</p>}<button className="submit-order" disabled={submitting || cart.length === 0} onClick={submitOrder}>{submitting ? "Sending order..." : `Place order • ${money(subtotal)}`}</button><small className="payment-note">Payment is coming soon. This version sends the order directly to Red Power Nutrition.</small>
    </aside></div>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="drink-modal" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}>×</button><p className="eyebrow">CUSTOMIZE</p><h2>{selected.name}</h2><p className="modal-price">Base drink {money(selected.price)}</p><h3>Add a boost</h3><div className="addon-list">{addons.map(addon => <button className={selectedAddons.some(a => a.name === addon.name) ? "addon active" : "addon"} key={addon.id || addon.name} onClick={() => toggleAddon(addon)}><span>{selectedAddons.some(a => a.name === addon.name) ? "✓" : "+"} {addon.name}</span><b>+{money(addon.price)}</b></button>)}</div><button className="submit-order" onClick={addToCart}>Add to cart • {money(modalTotal)}</button></div></div>}
  </main>;
}
