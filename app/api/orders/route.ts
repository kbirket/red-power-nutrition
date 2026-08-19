import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required." },
        { status: 400 }
      );
    }

    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 }
      );
    }

    if (
      body.fulfillment === "school_delivery" &&
      !body.teacher?.trim()
    ) {
      return NextResponse.json(
        { error: "Teacher or delivery location is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase server environment variables.");
      return NextResponse.json(
        { error: "Server database configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const items = body.items.map((item: any) => {
      const basePrice = Number(item.price) || 0;
      const addonTotal = Array.isArray(item.addons)
        ? item.addons.reduce(
            (sum: number, addon: any) =>
              sum + (Number(addon.price) || 0),
            0
          )
        : 0;

      return {
        menu_item_id: item.menuItemId || null,
        item_name: String(item.name || "Item"),
        unit_price: basePrice + addonTotal,
        quantity: Number(item.quantity) || 1,
        addons: Array.isArray(item.addons) ? item.addons : [],
      };
    });

    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum + item.unit_price * item.quantity,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: body.customerName.trim(),
        phone: body.phone?.trim() || null,
        fulfillment: body.fulfillment || "pickup",
        teacher_or_location:
          body.fulfillment === "school_delivery"
            ? body.teacher?.trim() || null
            : null,
        notes: body.notes?.trim() || null,
        school_schedule_id:
          body.fulfillment === "school_delivery"
            ? body.schoolScheduleId || null
            : null,
        status: "new",
        subtotal,
        fee: 0,
        total: subtotal,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Supabase order error:", orderError);
      return NextResponse.json(
        { error: orderError?.message || "Unable to create the order." },
        { status: 500 }
      );
    }

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      addons: item.addons,
    }));

    const { data: savedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select("id,order_id,item_name,unit_price,quantity,addons");

    if (itemsError || !savedItems || savedItems.length !== orderItems.length) {
      console.error("Supabase order items error:", itemsError);
      console.error("Expected order items:", orderItems.length, "Saved:", savedItems?.length || 0);

      await supabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        {
          error:
            itemsError?.message ||
            "The order details could not be saved. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      itemCount: savedItems.length,
    });
  } catch (error) {
    console.error("Order API error:", error);

    return NextResponse.json(
      { error: "Unable to place order." },
      { status: 500 }
    );
  }
}
