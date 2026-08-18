// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { airtableFetch } from '@/lib/airtable';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newOrder = await airtableFetch('Orders', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'Customer Name': body.customerName,
          'Status': 'New',
          'Amount Owed': body.totalAmount,
          'Pickup Time': body.pickupTime,
        },
      }),
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
