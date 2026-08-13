import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">RED POWER NUTRITION</p>
        <h1>Power your day.</h1>
        <p>Order loaded teas and protein shakes for pickup or Argonia Friday delivery.</p>
        <div className="actions">
          <Link className="primary" href="/order">Start an Order</Link>
          <Link className="secondary" href="/staff">Staff</Link>
          <Link className="secondary" href="/owner">Owner</Link>
        </div>
      </section>

      <section className="school">
        <span>🏫 ARGONIA FRIDAY DELIVERY</span>
        <h2>Orders due by 8:30 AM</h2>
        <p>Delivery between 9:30 and 10:00 AM every Friday.</p>
      </section>
    </main>
  );
}