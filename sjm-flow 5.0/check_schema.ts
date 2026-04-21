
import { supabaseManual } from './src/api';

async function checkColumns() {
  const { data, error } = await supabaseManual.from("jurnal").select("*").limit(1).single();
  if (error) {
    console.error("Error fetching journal:", error);
  } else {
    console.log("Journal columns:", Object.keys(data));
  }
}

checkColumns();
