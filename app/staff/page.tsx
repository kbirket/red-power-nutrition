"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import "./staff.css";

type Addon = {
  name: string;
  price?: number;
};

type OrderItem = {
  name: string;
  price: number;
  quantity?: number;
  addons?: Addon[];
};

type Order = {
  id: string;
  customer_name: string;
  phone?: string | null;
  fulfillment?: string | null;
  teacher?: string | null;
  notes?: string | null;
  total?: number | null;
  status?: string | null;
  items?: OrderItem[] | null;
  created_at?: string;
};

export default function StaffPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          item_name,
          unit_price,
          quantity,
          addons
        )
      `)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Could not load orders.");
    } else {
      const formattedOrders: Order[] = (data || []).map((order: any) => ({
        ...order,
        items: (order.order_items || []).map((item: any) => ({
          name: item.item_name,
          price: Number(item.unit_price || 0),
          quantity: Number(item.quantity || 1),
          addons: Array.isArray(item.addons) ? item.addons : [],
        })),
      }));

      setOrders(formattedOrders);
      setMessage("");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadOrders();

    const interval = setInterval(() => {
      loadOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not update this order.");
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  };

  const newOrders = orders.filter(
    (order) =>
      !order.status ||
      order.status === "new" ||
      order.status === "pending"
  );

  const makingOrders = orders.filter(
    (order) => order.status === "making" || order.status === "in_progress"
  );

  const readyOrders = orders.filter(
    (order) => order.status === "ready"
  );

  const completedOrders = orders.filter(
    (order) =>
      order.status === "completed" || order.status === "complete"
  );

  return (
    <main className="staff-page">
      <header className="staff-header">
        <div>
          <p className="staff-eyebrow">RED POWER NUTRITION</p>
          <h1>Staff Dashboard</h1>
          <p className="staff-subtitle">
            Manage incoming orders and keep the line moving.
          </p>
        </div>

        <div className="staff-actions">
          <button onClick={loadOrders} className="refresh-button">
            ↻ Refresh orders
          </button>

          <a href="/order" className="back-button">
            ← Order page
          </a>
        </div>
      </header>

      <section className="staff-stats">
        <div className="stat-card">
          <span>New</span>
          <strong>{newOrders.length}</strong>
        </div>

        <div className="stat-card">
          <span>Making</span>
          <strong>{makingOrders.length}</strong>
        </div>

        <div className="stat-card">
          <span>Ready</span>
          <strong>{readyOrders.length}</strong>
        </div>

        <div className="stat-card">
          <span>Completed</span>
          <strong>{completedOrders.length}</strong>
        </div>
      </section>

      {message && <p className="staff-message">{message}</p>}

      {loading && orders.length === 0 ? (
        <div className="staff-loading">Loading orders...</div>
      ) : (
        <section className="order-board">
          <OrderColumn
            title="🔴 New Orders"
            count={newOrders.length}
            orders={newOrders}
            empty="No new orders right now."
            buttonText="Start making →"
            buttonClass="start-button"
            onAction={(id) => updateStatus(id, "making")}
          />

          <OrderColumn
            title="🟡 Making"
            count={makingOrders.length}
            orders={makingOrders}
            empty="Nothing is being made right now."
            buttonText="Mark ready ✓"
            buttonClass="ready-button"
            onAction={(id) => updateStatus(id, "ready")}
          />

          <OrderColumn
            title="🟢 Ready"
            count={readyOrders.length}
            orders={readyOrders}
            empty="No orders waiting."
            buttonText="Complete order ✓"
            buttonClass="complete-button"
            onAction={(id) => updateStatus(id, "completed")}
          />
        </section>
      )}
    </main>
  );
}

function OrderColumn({
  title,
  count,
  orders,
  empty,
  buttonText,
  buttonClass,
  onAction,
}: {
  title: string;
  count: number;
  orders: Order[];
  empty: string;
  buttonText: string;
  buttonClass: string;
  onAction: (id: string) => void;
}) {
  return (
    <div className="order-column">
      <div className="column-header">
        <h2>{title}</h2>
        <span>{count}</span>
      </div>

      <div className="column-orders">
        {orders.length === 0 ? (
          <div className="empty-state">{empty}</div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              buttonText={buttonText}
              buttonClass={buttonClass}
              onAction={onAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  buttonText,
  buttonClass,
  onAction,
}: {
  order: Order;
  buttonText: string;
  buttonClass: string;
  onAction: (id: string) => void;
}) {
  const total =
    order.total ??
    order.items?.reduce((sum, item) => {
      const addonTotal =
        item.addons?.reduce(
          (addonSum, addon) => addonSum + Number(addon.price || 0),
          0
        ) || 0;

      return sum + Number(item.price || 0) * Number(item.quantity || 1) + addonTotal;
    }, 0) ??
    0;

  return (
    <article className="staff-order-card">
      <div className="order-card-top">
        <div>
          <h3>{order.customer_name || "Customer"}</h3>

          {order.created_at && (
            <p className="order-time">
              {new Date(order.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <strong className="order-total">
          ${Number(total).toFixed(2)}
        </strong>
      </div>

      <div className="order-details">
        <p>
          <span>📦</span>{" "}
          {order.fulfillment === "school_delivery"
            ? "Argonia Friday Delivery"
            : "Pickup"}
        </p>

        {order.phone && (
          <p>
            <span>📱</span> {order.phone}
          </p>
        )}

        {order.teacher && (
          <p>
            <span>🏫</span> {order.teacher}
          </p>
        )}
      </div>

      <div className="order-items">
        <h4>Order</h4>

        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <div className="staff-order-item" key={index}>
              <strong>
                {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ""}
                {item.name}
              </strong>

              <span>${Number(item.price || 0).toFixed(2)}</span>

              {item.addons && item.addons.length > 0 && (
                <small>
                  + {item.addons.map((addon) => addon.name).join(", ")}
                </small>
              )}
            </div>
          ))
        ) : (
          <p className="no-items">No item details available.</p>
        )}
      </div>

      {order.notes && (
        <div className="order-notes">
          <strong>Notes</strong>
          <p>{order.notes}</p>
        </div>
      )}

      <button
        className={`order-action ${buttonClass}`}
        onClick={() => onAction(order.id)}
      >
        {buttonText}
      </button>
    </article>
  );
}
