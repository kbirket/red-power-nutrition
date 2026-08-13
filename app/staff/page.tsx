export default function StaffPage() {
  const columns = ["New", "Making", "Ready"];
  return (
    <main className="page">
      <p className="eyebrow">STAFF</p>
      <h1>Order Dashboard</h1>
      <div className="kanban">
        {columns.map(column => (
          <section className="panel" key={column}>
            <h2>{column}</h2>
            <div className="empty">Live orders will appear here.</div>
          </section>
        ))}
      </div>
      <section className="panel">
        <h2>🏫 Argonia Friday</h2>
        <p>Order cutoff: <b>8:30 AM</b> · Delivery: <b>9:30–10:00 AM</b></p>
      </section>
    </main>
  );
}