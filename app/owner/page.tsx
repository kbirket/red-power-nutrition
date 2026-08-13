export default function OwnerPage() {
  const stats = [["Today's Sales", "$0.00"], ["Orders", "0"], ["Drinks Sold", "0"], ["Boost Revenue", "$0.00"]];
  return (
    <main className="page">
      <p className="eyebrow">OWNER</p>
      <h1>Analytics Dashboard</h1>
      <div className="stats">
        {stats.map(([label, value]) => <div className="stat" key={label}><small>{label}</small><strong>{value}</strong></div>)}
      </div>
      <div className="menu-grid">
        <section className="panel"><h2>Sales Trends</h2><p>Will calculate from completed orders.</p></section>
        <section className="panel"><h2>Top Drinks & Boosts</h2><p>Will calculate automatically from order items.</p></section>
      </div>
    </main>
  );
}