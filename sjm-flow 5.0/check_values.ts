
import { supabaseManual } from './src/api';

async function checkValues() {
  const { data, error } = await supabaseManual.from("jurnal").select("status").limit(20);
  if (error) {
    console.error("Error:", error);
  } else {
    const statuses = [...new Set(data.map((j: any) => j.status))];
    console.log("Existing statuses in jurnal table:", statuses);
  }
}

checkValues();
