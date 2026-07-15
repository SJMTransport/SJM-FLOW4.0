import fetch from 'node-fetch';

const SUPABASE_URL = "https://sdxyaegmbuccybvfesyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_2aIB9S-aXSw0xkMXEkIhNw_a6JUoSMF";

async function run() {
  const url = `${SUPABASE_URL}/rest/v1/`;
  const response = await fetch(url, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    console.error("HTTP error:", response.status, response.statusText);
    return;
  }

  const spec: any = await response.json();
  const paths = Object.keys(spec.paths || {});
  console.log("Exposed Postgrest paths:");
  paths.forEach(p => console.log(`- ${p}`));
  
  console.log("\nDefinitions:");
  console.log(Object.keys(spec.definitions || {}));
}

run();
