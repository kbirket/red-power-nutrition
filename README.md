# Red Power Nutrition — Real MVP Starter

## What is included
- Next.js + TypeScript starter
- Customer ordering pages
- Staff order queue shell
- Owner analytics shell
- Supabase schema for:
  - users and roles
  - menu items and seasonal items
  - boosts/add-ons
  - orders and live status flow
  - Argonia recurring Friday delivery
  - loyalty (12 drinks → 1 free)
  - payment placeholders
  - analytics foundation

## Setup
1. Install Node.js.
2. In this folder run `npm install`.
3. Create a Supabase project.
4. Run `supabase/schema.sql` in the Supabase SQL editor.
5. Add your Supabase environment variables in Vercel or copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.
6. Run `npm run dev`.

## Next coding milestones
1. Add real menu CRUD for the owner.
2. Build the cart and create orders.
3. Add Supabase Realtime to staff orders.
4. Add staff/owner authentication and role protection.
5. Add loyalty transactions.
6. Build analytics queries and charts.
7. Plug in online payment later.
