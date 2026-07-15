import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sdxyaegmbuccybvfesyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_2aIB9S-aXSw0xkMXEkIhNw_a6JUoSMF";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Testing insert into invoices with tipe='masuk'...");
  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      no_invoice: 'TEST-MASUK-999',
      tgl_invoice: '2026-07-15',
      customer: 'PT. Test Vendor',
      total_setelah_pajak: 1250000,
      tipe: 'masuk',
      status: 'Belum Diterima',
      keterangan_invoice: 'Test keterangan'
    }])
    .select();

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success!", data);
    
    // Clean up
    const { error: delErr } = await supabase.from('invoices').delete().eq('no_invoice', 'TEST-MASUK-999');
    console.log("Clean up response error:", delErr);
  }
}

run();
