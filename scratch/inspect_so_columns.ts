import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sdxyaegmbuccybvfesyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_2aIB9S-aXSw0xkMXEkIhNw_a6JUoSMF";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: soData } = await supabase.from('sales_order').select('*').limit(1);
  if (soData && soData.length > 0) {
    console.log("Sales Order columns:", Object.keys(soData[0]));
  }

  const { data: invData } = await supabase.from('invoices').select('*').limit(1);
  if (invData && invData.length > 0) {
    console.log("Invoices columns:", Object.keys(invData[0]));
  }
}

run();
