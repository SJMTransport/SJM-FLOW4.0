import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sdxyaegmbuccybvfesyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_2aIB9S-aXSw0xkMXEkIhNw_a6JUoSMF";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  // Let's call the information_schema or run a RPC query if there is one that returns functions.
  // Sometimes there's a custom helper RPC.
  // Let's try calling pg_proc query or general inspection RPCs if we know any.
  // Wait, let's try calling known pg functions like check_rls, rls_auto_enable, etc.
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log("exec_sql response:", data, error);

  const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { sql: 'SELECT 1;' });
  console.log("execute_sql response:", data2, error2);

  const { data: data3, error: error3 } = await supabase.rpc('run_sql', { sql: 'SELECT 1;' });
  console.log("run_sql response:", data3, error3);
}

run();
