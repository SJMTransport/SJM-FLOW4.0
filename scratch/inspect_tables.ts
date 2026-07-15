import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sdxyaegmbuccybvfesyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_2aIB9S-aXSw0xkMXEkIhNw_a6JUoSMF";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  // Query all tables in the public schema
  const { data: tables, error } = await supabase.rpc('inspect_schema_tables');
  if (error) {
    console.error("Error calling inspect_schema_tables:", error);
    
    // Fallback: try raw query or direct select on a metadata query if RPC doesn't exist
    console.log("Attempting direct select from PG system catalog via an RPC query if available, or list known tables...");
  } else {
    console.log("Tables in schema:", tables);
  }

  // Let's test reading from common tables to check if they exist:
  const checkTables = ['invoices', 'invoices_masuk', 'incoming_invoices', 'surat_jalan', 'sales_order'];
  for (const t of checkTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}' error/does not exist:`, error.message);
    } else {
      console.log(`Table '${t}' exists! Sample row:`, data);
    }
  }
}

run();
