"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import "./order.css";

type Drink = { id: string; name: string; price: number; description?: string | null; category: "tea" | "shake" };
type Addon = { id: string; name: string; price: number };
type MenuOption = { id: string; menuItemId: string; name: string; price: number };
type CartItem = Drink & { cartId: string; addons: Addon[]; selectedOption?: MenuOption };

const fallbackTeas: Drink[] = [
  { id: "tea-1", name: "Airhead Extreme", price: 8.5, description: "Loaded tea", category: "tea" },
  { id: "tea-2", name: "Autumn Gold", price: 8.5, description: "Loaded tea", category: "tea" },
  { id: "tea-3", name: "Bahama Mama", price: 8.5, description: "Loaded tea", category: "tea" },
  { id: "tea-4", name: "Baja Blast", price: 8.5, description: "Loaded tea", category: "tea" },
];
const fallbackShakes: Drink[] = [{ id: "shake-1", name: "Protein Shake", price: 9, description: "Protein shake", category: "shake" }];
const money = (value: number) => `$${value.toFixed(2)}`;

function nextFridayDelivery() {
  const today = new Date();
  const days = (5 - today.getDay() + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + days);
  return friday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function OrderPage() {
  const [teas, setTeas] = useState<Drink[]>(fallbackTeas);
  const [shakes, setShakes] = useState<Drink[]>(fallbackShakes);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [selected, setSelected] = useState<Drink | null>(null);
  const [selectedOption, setSelectedOption] = useState<MenuOption | undefined>();
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
    const s = createClient();
    Promise.all([
      s.from("menu_items").select("id,name,price,description,menu_categories(name)").eq("is_available", true),
      s.from("addons").select("id,name,price").eq("is_available", true),
      s.from("menu_item_options").select("id,menu_item_id,name,price"),
      s.from("school_schedules").select("id").eq("school_name", "Argonia").eq("active", true).limit(1),
    ]).then(([m, a, o, sch]) => {
      if (m.data?.length) {
        const items: Drink[] = m.data.map((i: any) => ({ id: i.id, name: i.name, price: Number(i.price), description: i.description, category: i.menu_categories?.name === "Protein Shakes" ? "shake" : "tea" }));
        setTeas(items.filter((i) => i.category === "tea"));
        setShakes(items.filter((i) => i.category === "shake"));
      }
      if (a.data?.length) setAddons(a.data.map((x: any) => ({ id: x.id, name: x.name, price: Number(x.price) })));
      if (o.data?.length) setMenuOptions(o.data.map((x: any) => ({ id: x.id, menuItemId: x.menu_item_id, name: x.name, price: Number(x.price) })));
      if (sch.data?.[0]) setSchoolScheduleId(sch.data[0].id);
    });
  }, []);

  const optionsForSelected = useMemo(() => selected ? menuOptions.filter((o) => o.menuItemId === selected.id) : [], [selected, menuOptions]);
  const selectedBasePrice = selectedOption ? selectedOption.price : selected?.price || 0;
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price + item.addons.reduce((a, addon) => a + addon.price, 0), 0), [cart]);
  const modalTotal = selectedBasePrice + selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const toggleAddon = (addon: Addon) => setSelectedAddons((current) => current.some((a) => a.id === addon.id) ? current.filter((a) => a.id !== addon.id) : [...current, addon]);

  const addToCart = () => {
    if (!selected) return;
    if (optionsForSelected.length && !selectedOption) return setError("Please choose a size or level.");
    setCart((current) => [...current, { ...selected, price: selectedBasePrice, cartId: crypto.randomUUID(), addons: selectedAddons, selectedOption }]);
    setSelected(null); setSelectedOption(undefined); setSelectedAddons([]); setError(null);
  };

  const submitOrder = async () => {
    setError(null); setSuccess(null);
    if (!cart.length) return setError("Add at least one drink to your order.");
    if (!name.trim()) return setError("Please enter your name.");
    if (fulfillment === "school_delivery" && !teacher.trim()) return setError("Please enter the teacher, classroom, or delivery location.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: name, phone, fulfillment, teacher, notes, schoolScheduleId, items: cart.map((item) => ({ menuItemId: item.id.startsWith("tea-") || item.id.startsWith("shake-") ? null : item.id, name: item.name, price: item.price, quantity: 1, addons: [...(item.selectedOption ? [{ id: item.selectedOption.id, name: item.selectedOption.name, price: 0, type: "size_or_level" }] : []), ...item.addons] })) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to place order.");
      setSuccess("Order received! Red Power Nutrition will take it from here."); setCart([]); setName(""); setPhone(""); setTeacher(""); setNotes("");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Something went wrong sending your order. Please try again."); } finally { setSubmitting(false); }
  };

  const openDrink = (drink: Drink) => { setSelected(drink); setSelectedOption(undefined); setSelectedAddons([]); setError(null); };
  const renderDrinks = (drinks: Drink[]) => drinks.map((drink) => <button className="drink-card" key={drink.id || drink.name} onClick={() => openDrink(drink)}><strong>{drink.name}</strong><span>{drink.description || (drink.category === "tea" ? "Loaded tea" : "Protein shake")}</span><b>{money(drink.price)}</b><small>Customize +</small></button>);

  return <main className="order-page">
    <header className="order-header"><div className="brand-area"><img src="/red-power-logo.png" alt="Red Power Nutrition" className="brand-logo" /><div className="brand-copy"><h1>ORDER YOUR POWER.</h1><p>Choose your drink, customize it, and we’ll take it from there.</p></div></div><div className="cart-badge">🛒 {cart.length} {cart.length === 1 ? "drink" : "drinks"}</div></header>
    <section className="school-banner"><strong>🏫 Argonia Fridays</strong><span>Order by 8:30 AM • Delivery 9:30–10:00 AM • Next available: {nextFridayDelivery()}</span></section>
    <div className="order-layout"><div className="menu-column"><section><div className="section-title"><h2>🧋 Loaded Teas</h2><span>{teas.length} flavors</span></div><div className="drink-grid">{renderDrinks(teas)}</div></section><section><div className="section-title"><h2>🥤 Protein Shakes</h2><span>{shakes.length} flavors</span></div><div className="drink-grid">{renderDrinks(shakes)}</div></section></div>
    <aside className="checkout panel"><div className="checkout-head"><div><p className="eyebrow">YOUR ORDER</p><h2>{cart.length ? `${cart.length} drink${cart.length === 1 ? "" : "s"}` : "Your cart is empty"}</h2></div><strong>{money(subtotal)}</strong></div>
      {cart.map((item) => <div className="cart-item" key={item.cartId}><div><strong>{item.name}</strong>{item.selectedOption && <small>{item.selectedOption.name}</small>}{item.addons.length > 0 && <small>{item.addons.map((addon) => addon.name).join(" • ")}</small>}</div><div><b>{money(item.price + item.addons.reduce((sum, addon) => sum + addon.price, 0))}</b><button onClick={() => setCart((current) => current.filter((x) => x.cartId !== item.cartId))}>×</button></div></div>)}
      <div className="fulfillment"><button className={fulfillment === "pickup" ? "active" : ""} onClick={() => setFulfillment("pickup")}>🏪 Pickup</button><button className={fulfillment === "school_delivery" ? "active" : ""} onClick={() => setFulfillment("school_delivery")}>🏫 Argonia Friday</button></div><div className="checkout-fields"><input placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} /><input placeholder="Phone number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />{fulfillment === "school_delivery" && <input placeholder="Teacher / classroom / delivery location *" value={teacher} onChange={(e) => setTeacher(e.target.value)} />}<textarea placeholder="Order notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>{error && <p className="form-error">{error}</p>}{success && <p className="form-success">{success}</p>}<button className="submit-order" disabled={submitting || !cart.length} onClick={submitOrder}>{submitting ? "Sending order..." : `Place order • ${money(subtotal)}`}</button><small className="payment-note">Payment is coming soon. This version sends the order directly to Red Power Nutrition.</small></aside></div>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="drink-modal" onClick={(e) => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}>×</button><p className="eyebrow">CUSTOMIZE</p><h2>{selected.name}</h2>{optionsForSelected.length > 0 && <><h3>{selected.category === "tea" ? "Choose a size or level" : "Choose an option"}</h3><div className="addon-list">{optionsForSelected.map((option) => <button className={selectedOption?.id === option.id ? "addon active" : "addon"} key={option.id} onClick={() => setSelectedOption(option)}><span>{selectedOption?.id === option.id ? "✓" : "+"} {option.name}</span><b>{money(option.price)}</b></button>)}</div></>}{selected.category === "tea" && addons.length > 0 && <><h3>Add a boost</h3><div className="addon-list">{addons.map((addon) => { const isSelected = selectedAddons.some((x) => x.id === addon.id); return <button className={isSelected ? "addon active" : "addon"} key={addon.id || addon.name} onClick={() => toggleAddon(addon)}><span>{isSelected ? "✓" : "+"} {addon.name}</span><b>+{money(addon.price)}</b></button>; })}</div></>}<button className="submit-order" onClick={addToCart}>Add to cart • {money(modalTotal)}</button></div></div>}
  </main>;
}