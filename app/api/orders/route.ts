import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          customer_name: body.customerName,
          phone: body.phone || null,
          fulfillment: body.fulfillment || null,
          teacher: body.teacher || null,
          notes: body.notes || null,
          status: "new",
          total: body.total || 0,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error("Supabase order error:", orderError);

      return NextResponse.json(
        { error: orderError.message },
        { status: 500 }
      );
    }

    // 2. Create the order items
    if (body.items && body.items.length > 0) {
      const orderItems = body.items.map((item: any) => ({
        order_id: order.id,

        // Adjust these RIGHT SIDE values if your cart uses
        // different property names
        item_name: item.name,

        quantity: item.quantity || 1,

        // Your database requires unit_price
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Supabase order items error:", itemsError);

        return NextResponse.json(
          { error: itemsError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Order API error:", error);

    return NextResponse.json(
      { error: "Unable to place order" },
      { status: 500 }
    );
  }
}
