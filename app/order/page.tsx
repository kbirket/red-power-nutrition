const teas = [
  { name: "Airhead Extreme", price: 8.5 },
  { name: "Gummy Worm", price: 8.5 },
  { name: "Hurricane", price: 8.5 },
];
const shakes = [
  { name: "Dunkaroo", price: 9 },
  { name: "PB & J", price: 9 },
  { name: "Zebra Cake", price: 9 },
];

export default function OrderPage() {
  return (
    <main className="page">
      <p className="eyebrow">CUSTOMER ORDERING</p>
      <h1>Choose your power.</h1>
      <div className="menu-grid">
        <section className="panel">
          <h2>🧋 Loaded Teas</h2>
          {teas.map(d => <div className="menu-item" key={d.name}><span>{d.name}</span><b>${d.price.toFixed(2)}</b></div>)}
        </section>
        <section className="panel">
          <h2>🥤 Protein Shakes</h2>
          {shakes.map(d => <div className="menu-item" key={d.name}><span>{d.name}</span><b>${d.price.toFixed(2)}</b></div>)}
        </section>
      </div>
      <p className="note">Next step: connect these menu items to the Supabase database and a shopping cart.</p>
    </main>
  );
}