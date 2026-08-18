import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("orders").insert([
      {
        customer_name: body.customerName,
        phone: body.phone || null,
        fulfillment: body.fulfillment || null,
        teacher: body.teacher || null,
        notes: body.notes || null,
        status: "new",
        total: body.total || 0,
      },
    ]);

    if (error) {
      console.error("Supabase order error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order API error:", error);

    return NextResponse.json(
      { error: "Unable to place order" },
      { status: 500 }
    );
  }
}
