// lib/airtable.ts

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_PAT || !BASE_ID) {
  throw new Error('Missing Airtable environment variables in Vercel/env config');
}

export async function airtableFetch(endpoint: string, options: RequestInit = {}) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Prevent aggressive caching so staff/orders update dynamically
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Airtable API error: ${res.statusText}`);
  }

  return res.json();
}
