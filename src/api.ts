import { createClient } from '@supabase/supabase-js';

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://sdxyaegmbuccybvfesyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_2aIB9S-aXSw0xkMXEkIhNw_a6JUoSMF";

// The user provided a custom fetch-based client. I'll maintain that logic
// but wrap it in an object that looks like the one in their code.
export const supabaseManual = (() => {
  const H = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };
  const base = `${SUPABASE_URL}/rest/v1`;

  async function doFetch(table: string, qs = "", ranged = true) {
    const url = `${base}/${table}?${qs}`;
    const r = await fetch(url, { headers: ranged ? { ...H, "Range": "0-9999" } : H });
    const d = await r.json();
    if (!r.ok) return { data: null, error: d };
    return { data: d, error: null };
  }
  
  async function doMut(table: string, method: string, body: any, qs = "") {
    const url = `${base}/${table}${qs ? "?" + qs : ""}`;
    const r = await fetch(url, { method, headers: H, body: body != null ? JSON.stringify(body) : undefined });
    if (method === "DELETE") return { data: null, error: r.ok ? null : await r.json() };
    const d = await r.json();
    if (!r.ok) return { data: null, error: d };
    return { data: Array.isArray(d) ? d : [d], error: null };
  }

  function qb(table: string, filters: string[] = [], selCols = "*", orderStr = "", limitN: number | null = null) {
    const build = () => {
      const parts = [`select=${selCols}`, ...filters];
      if (orderStr) parts.push(orderStr);
      if (limitN) parts.push(`limit=${limitN}`);
      return parts.join("&");
    };
    
    const runner: any = {
      eq: (col: string, val: string) => qb(table, [...filters, `${col}=eq.${encodeURIComponent(val)}`], selCols, orderStr, limitN),
      order: (col: string, opts: any = {}) => qb(table, filters, selCols, `order=${col}.${opts.ascending === false ? "desc" : "asc"}`, limitN),
      limit: (n: number) => qb(table, filters, selCols, orderStr, n),
      single: async () => {
        const { data, error } = await doFetch(table, build());
        if (error) return { data: null, error };
        return { data: Array.isArray(data) ? data[0] || null : data, error: null };
      },
      then: (onfulfilled: any, onrejected: any) => {
        return doFetch(table, build()).then(onfulfilled, onrejected);
      }
    };
    return runner;
  }

  return {
    from: (table: string) => ({
      select: (cols = "*") => qb(table, [], cols),
      insert: (rows: any) => {
        const p = doMut(table, "POST", Array.isArray(rows) ? rows : [rows]);
        return {
          select: () => p,
          then: (res: any, rej: any) => p.then(res, rej)
        } as any;
      },
      update: (data: any) => {
        const wrap = (qs: string) => {
           const p = doMut(table, "PATCH", data, qs);
           return {
             select: () => p,
             then: (res: any, rej: any) => p.then(res, rej)
           } as any;
        };
        return {
          eq: (col: string, val: string) => wrap(`${col}=eq.${encodeURIComponent(val)}`),
          in: (col: string, vals: any[]) => wrap(`${col}=in.(${vals.map(v => encodeURIComponent(String(v))).join(",")})`)
        };
      },
      delete: () => {
        const wrap = (qs: string) => {
           const p = doMut(table, "DELETE", null, qs);
           return {
             then: (res: any, rej: any) => p.then(res, rej)
           } as any;
        };
        return {
          eq: (col: string, val: string) => wrap(`${col}=eq.${encodeURIComponent(val)}`),
          in: (col: string, vals: any[]) => wrap(`${col}=in.(${vals.map(v => encodeURIComponent(String(v))).join(",")})`)
        };
      },
    }),
  };
})();

// Real client if needed later
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const api = {
  getCoa: async () => {
    const { data, error } = await supabaseManual.from("coa").select("*").eq("status", "Aktif").order("kode", { ascending: true });
    if (error) { console.error("getCoa", error); return []; }
    return data || [];
  },
  getAllCoa: async () => {
    const { data, error } = await supabaseManual.from("coa").select("*").order("kode", { ascending: true });
    if (error) { console.error("getAllCoa", error); return []; }
    return data || [];
  },
  addCoa: async (data: any) => {
    const { data: res, error } = await supabaseManual.from("coa").insert([data]).select();
    if (error) throw new Error(error.message || "Gagal tambah COA");
    return res || [];
  },
  updateCoa: async (id: string, data: any) => {
    const { error } = await supabaseManual.from("coa").update(data).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update COA");
    return [];
  },
  deleteCoa: async (id: string) => {
    const { error } = await supabaseManual.from("coa").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus COA");
    return [];
  },
  getJurnal: async () => {
    const { data, error } = await supabaseManual.from("jurnal").select("*, jurnal_detail(*)").is("deleted_at", null).order("no_jurnal", { ascending: true });
    if (error) {
      console.error("getJurnal", error);
      throw new Error("Gagal memuat data jurnal: " + (error.message || JSON.stringify(error)));
    }
    return (data || []).map((j: any) => ({
      ...j,
      status: j.status || "Draft"
    }));
  },
  bulkApproveJurnal: async (ids: string[]) => {
    const { error } = await supabaseManual.from("jurnal").update({ status: "Posted" }).in("id", ids);
    if (error) throw new Error(error.message || "Gagal approve jurnal");
    return [];
  },
  createJurnalWithDetails: async (header: any, details: any[]) => {
    const { data, error } = await supabase.rpc("create_jurnal_with_details", {
      p_no_jurnal:   header.no_jurnal,
      p_tanggal:     header.tanggal,
      p_no_bukti:    header.no_bukti   || null,
      p_keterangan:  header.keterangan || null,
      p_no_so:       header.no_so      || null,
      p_so_values:   header.so_values  || {},
      p_total_debit: header.total_debit,
      p_total_kredit: header.total_kredit,
      p_status:      header.status,
      p_created_by:  header.created_by,
      p_details:     details,
    });
    if (error) throw new Error(error.message || "Gagal simpan jurnal");
    if (data == null) throw new Error("Jurnal tidak tersimpan — server tidak mengembalikan data");
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.success === false) throw new Error(row?.message || "Gagal simpan jurnal");
    return (row?.jurnal_id ?? null) as string;
  },
  updateJurnalWithDetails: async (id: string, header: any, details: any[]) => {
    const { data, error } = await supabase.rpc("update_jurnal_with_details", {
      p_id:          id,
      p_no_jurnal:   header.no_jurnal,
      p_tanggal:     header.tanggal,
      p_no_bukti:    header.no_bukti   || null,
      p_keterangan:  header.keterangan || null,
      p_no_so:       header.no_so      || null,
      p_so_values:   header.so_values  || {},
      p_total_debit: header.total_debit,
      p_total_kredit: header.total_kredit,
      p_status:      header.status,
      p_details:     details,
    });
    if (error) throw new Error(error.message || "Gagal update jurnal");
    if (data == null) throw new Error("Jurnal tidak terupdate — server tidak mengembalikan data");
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.success === false) throw new Error(row?.message || "Gagal update jurnal");
  },
  /** @deprecated Superseded by createJurnalWithDetails RPC. Do not use. */
  addJurnal: async (data: any) => {
    const { data: res, error } = await supabaseManual.from("jurnal").insert([data]).select();
    if (error) throw new Error(error.message || "Gagal tambah jurnal");
    return res || [];
  },
  /** @deprecated Superseded by createJurnalWithDetails RPC. Do not use. */
  addJurnalDetail: async (rows: any[]) => {
    const { error } = await supabaseManual.from("jurnal_detail").insert(rows);
    if (error) throw new Error(error.message || "Gagal tambah detail jurnal");
    return [];
  },
  updateJurnal: async (id: string, data: any) => {
    const { error } = await supabaseManual.from("jurnal").update(data).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update jurnal");
    return [];
  },
  deleteJurnal: async (id: string, deletedBy: string) => {
    const now = new Date().toISOString();
    const { error } = await supabaseManual.from("jurnal")
      .update({ deleted_at: now, deleted_by: deletedBy })
      .eq("id", id);
    if (error) throw new Error("Gagal menghapus jurnal: " + (error.message || JSON.stringify(error)));
    return [];
  },
  getPiutang: async () => {
    const { data, error } = await supabaseManual.from("piutang").select("*").order("tgl_invoice", { ascending: false });
    if (error) { console.error("getPiutang", error); return []; }
    return data || [];
  },
  addPiutang: async (data: any) => {
    const row = { ...data, sisa_piutang: (data.total_piutang || 0) - (data.total_bayar || 0) };
    const { data: res, error } = await supabaseManual.from("piutang").insert([row]).select();
    if (error) throw new Error(error.message || "Gagal tambah piutang");
    return res || [];
  },
  updatePiutang: async (id: string, data: any) => {
    const updated = { ...data, sisa_piutang: (Number(data.total_piutang) || 0) - (Number(data.total_bayar) || 0) };
    const { error } = await supabaseManual.from("piutang").update(updated).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update piutang");
    return [];
  },
  getCustomer: async () => {
    const { data, error } = await supabaseManual.from("customer").select("*").order("nama", { ascending: true });
    if (error) { console.error("getCustomer", error); return []; }
    return data || [];
  },
  addCustomer: async (data: any) => {
    const { data: res, error } = await supabaseManual.from("customer").insert([data]).select();
    if (error) throw new Error(error.message || "Gagal tambah customer");
    return res || [];
  },
  updateCustomer: async (id: string, data: any) => {
    const { error } = await supabaseManual.from("customer").update(data).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update customer");
    return [];
  },
  deleteCustomer: async (id: string) => {
    const { error } = await supabaseManual.from("customer").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus customer");
    return [];
  },
  getVendor: async () => {
    const { data, error } = await supabaseManual.from("vendor").select("*").order("nama", { ascending: true });
    if (error) { console.error("getVendor", error); return []; }
    return data || [];
  },
  addVendor: async (data: any) => {
    const { data: res, error } = await supabaseManual.from("vendor").insert([data]).select();
    if (error) throw new Error(error.message || "Gagal tambah vendor");
    return res || [];
  },
  updateVendor: async (id: string, data: any) => {
    const { error } = await supabaseManual.from("vendor").update(data).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update vendor");
    return [];
  },
  deleteVendor: async (id: string) => {
    const { error } = await supabaseManual.from("vendor").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus vendor");
    return [];
  },
  /** @deprecated Use genJUNo from utils instead. */
  getLastJurnalNo: async () => {
    const { data, error } = await supabaseManual.from("jurnal").select("no_jurnal").order("created_at", { ascending: false }).limit(1);
    if (error || !data?.length) return [];
    return data;
  },
  renomorJurnal: async () => {
    const { data, error } = await supabaseManual.from("jurnal").select("id,tanggal,created_at,no_jurnal").order("tanggal", { ascending: true }).order("created_at", { ascending: true });
    if (error || !data?.length) throw new Error("Gagal ambil data jurnal: " + (error?.message || ""));
    const yr = new Date().getFullYear().toString().slice(-2);
    let updated = 0;
    for (let i = 0; i < data.length; i++) {
      const no = `JU-${String(i + 1).padStart(5, "0")}.${yr}`;
      if (data[i].no_jurnal === no) { updated++; continue; }
      const { error: updErr } = await supabaseManual.from("jurnal").update({ no_jurnal: no }).eq("id", data[i].id);
      if (updErr) throw new Error(`Gagal update jurnal id ${data[i].id}: ${updErr.message}`);
      updated++;
    }
    return updated;
  },
  getSaldoAwal: async () => {
    const { data, error } = await supabaseManual.from("saldo_awal").select("*");
    if (error) return [];
    return data || [];
  },
  upsertSaldoAwal: async (rows: any[]) => {
    for (const r of rows) {
      const { data: existing } = await supabaseManual.from("saldo_awal").select("id").eq("coa_kode", r.coa_kode).single().catch(() => ({ data: null }));
      if (existing?.id) {
        await supabaseManual.from("saldo_awal").update({ debit: r.debit, kredit: r.kredit }).eq("id", existing.id);
      } else {
        await supabaseManual.from("saldo_awal").insert([r]);
      }
    }
    return [];
  },
  deleteSaldoAwal: async (coa_kode: string) => {
    await supabaseManual.from("saldo_awal").delete().eq("coa_kode", coa_kode);
  },
  getSO: async () => {
    try {
      const { data, error } = await supabaseManual.from("sales_order").select("*").order("tgl_order", { ascending: false });
      if (error) throw error;
      const validStatuses = ["Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled", "Hold"];
      return (data || []).map((s: any) => ({
        ...s,
        posisi_log: Array.isArray(s.posisi_log) ? s.posisi_log : [],
        modal_legs: Array.isArray(s.modal_legs) ? s.modal_legs : [],
        status_muatan: validStatuses.includes(s.status_muatan) ? s.status_muatan : (s.status_muatan || "Order Confirmed"),
        is_posted: s.is_posted ?? false,
        bukti_muatan: s.bukti_muatan || null,
        surat_jalan: s.surat_jalan || null,
        scan_invoice: s.scan_invoice || null,
        potong_pajak: s.potong_pajak || null,
        invoice_vendor: s.invoice_vendor || null,
      }));
    } catch (e) { console.error('getSO', e); return []; }
  },
  addSO: async (data: any) => {
    const { id: _drop, ...rest } = data;
  const NUMERIC = ["base_harga", "harga_asuransi", "nilai_pajak", "nilai_tanggungan", "nilai_asuransi", "harga_pengiriman", "total_harga", "total_harga_pajak", "tonase", "harga_per_ton", "pajak"];
    const DATE_FIELDS = ["tgl_order", "tgl_muat", "tgl_bongkar"];
    const KNOWN_COLS = new Set(["order_id", "no_invoice", "kode_invoice", "laporan_keuangan", "tgl_order",
      "tgl_muat", "jam_muat", "lokasi_muat", "sharelok_muat", "lokasi_bongkar", "sharelok_bongkar",
      "customer", "pic_cust", "no_pic", "nama_sopir", "nama_vendor", "jenis_truk", "no_polisi",
      "no_supir", "armada", "unit_muatan", "base_harga", "harga_asuransi", "pajak", "nilai_pajak",
      "harga_pengiriman", "total_harga", "muatan", "sn", "spk", "status_muatan", "tgl_bongkar",
      "no_asuransi", "nilai_tanggungan", "nilai_asuransi", "nilai_tanpa_asuransi", "total_harga_pajak",
      "keterangan", "update_ke_customer", "posisi_log", "modal_legs", "dokumen", "no_so_lama",
      "is_posted", "bukti_muatan", "surat_jalan", "tonase", "harga_per_ton",
      "foto_muat", "foto_bongkar", "dokumen_asuransi",
      "scan_invoice", "potong_pajak", "invoice_vendor"]);
    Object.keys(rest).forEach(k => { if (!KNOWN_COLS.has(k)) delete rest[k]; });
    NUMERIC.forEach((k: any) => {
      const v = rest[k];
      if (v === "" || v === undefined || v === null) rest[k] = null;
      else rest[k] = Number(v) || null;
    });
    DATE_FIELDS.forEach((k: any) => {
      if (!rest[k]) rest[k] = null;
    });
    const row = { ...rest, posisi_log: data.posisi_log || [], modal_legs: data.modal_legs || [] };
    const { data: res, error } = await supabaseManual.from("sales_order").insert([row]).select();
    if (error) throw new Error(error.message || "Gagal simpan SO ke Supabase");
    return res;
  },
  addSOBulk: async (rows: any[]) => {
    const NUMERIC = ["base_harga", "harga_asuransi", "nilai_pajak", "nilai_tanggungan", "nilai_asuransi", "harga_pengiriman", "total_harga", "total_harga_pajak", "tonase", "harga_per_ton", "pajak"];
    const KNOWN_COLS = new Set(["order_id", "no_invoice", "kode_invoice", "laporan_keuangan", "tgl_order",
      "tgl_muat", "jam_muat", "lokasi_muat", "sharelok_muat", "lokasi_bongkar", "sharelok_bongkar",
      "customer", "pic_cust", "no_pic", "nama_sopir", "nama_vendor", "jenis_truk", "no_polisi",
      "no_supir", "armada", "unit_muatan", "base_harga", "harga_asuransi", "pajak", "nilai_pajak",
      "harga_pengiriman", "total_harga", "muatan", "sn", "spk", "status_muatan", "tgl_bongkar",
      "no_asuransi", "nilai_tanggungan", "nilai_asuransi", "nilai_tanpa_asuransi", "total_harga_pajak",
      "keterangan", "update_ke_customer", "posisi_log", "modal_legs", "dokumen", "no_so_lama",
      "is_posted", "bukti_muatan", "surat_jalan", "tonase", "harga_per_ton",
      "foto_muat", "foto_bongkar", "dokumen_asuransi",
      "scan_invoice", "potong_pajak", "invoice_vendor"]);

    // Process all rows first
    const processedRows = rows.map(data => {
      const { id: _drop, ...rest } = data;
      Object.keys(rest).forEach(k => { if (!KNOWN_COLS.has(k)) delete rest[k]; });
      NUMERIC.forEach((k: any) => {
        if (k in rest) {
          const v = rest[k];
          if (v === "" || v === undefined || v === null) rest[k] = null;
          else rest[k] = Number(v.toString().replace(/[^0-9.-]/g, "")) || null;
        }
      });
      return { ...rest, posisi_log: data.posisi_log || [], modal_legs: data.modal_legs || [] };
    });

    // Get all order_ids in current batch
    const orderIds = processedRows.map(r => r.order_id).filter(Boolean);
    
    // Fetch existing records to know what to update vs insert
    const { data: existingRecords } = await supabase.from("sales_order").select("id, order_id").in("order_id", orderIds);
    const existingMap = new Map((existingRecords || []).map((r: any) => [r.order_id, r.id]));

    const toUpdate = [];
    const toInsert = [];

    for (const row of processedRows) {
      if (existingMap.has(row.order_id)) {
        toUpdate.push({ ...row, id: existingMap.get(row.order_id) });
      } else {
        toInsert.push(row);
      }
    }

    const results = [];
    
    // Batch Insertions
    if (toInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { data: res, error } = await supabase.from("sales_order").insert(batch).select();
        if (error) throw error;
        results.push(...(res || []));
      }
    }

    // Batch Updates (Supabase/PostgREST doesn't support bulk update with different values per row easily 
    // without a unique constraint, so we do them individually or in a small loop)
    // Since we have the unique ID now, it's safe.
    if (toUpdate.length > 0) {
      for (const row of toUpdate) {
        const { id, ...data } = row;
        const { data: res, error } = await supabase.from("sales_order").update(data).eq("id", id).select();
        if (error) throw error;
        results.push(...(res || []));
      }
    }

    return results;
  },
  updateSO: async (id: string, data: any) => {
    const NUMERIC = ["base_harga", "harga_asuransi", "nilai_pajak", "nilai_tanggungan", "nilai_asuransi", "harga_pengiriman", "total_harga", "total_harga_pajak"];
    const DATE_FIELDS = ["tgl_order", "tgl_muat", "tgl_bongkar"];
    NUMERIC.forEach((k: any) => {
      if (k in data) {
        const v = data[k];
        if (v === "" || v === undefined) data[k] = null;
        else if (v !== null) data[k] = Number(v) || null;
      }
    });
    DATE_FIELDS.forEach((k: any) => { 
      if (k in data && !data[k]) data[k] = null; 
    });
    const { error } = await supabaseManual.from("sales_order").update(data).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update SO");
    return [];
  },
  deleteSO: async (id: string) => {
    const { error } = await supabaseManual.from("sales_order").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus SO");
    return [];
  },
  bulkPostSO: async (ids: string[]) => {
    const { error } = await supabaseManual.from("sales_order").update({ is_posted: true }).in("id", ids);
    if (error) throw new Error(error.message || "Gagal posting SO");
    return [];
  },
  bulkDeleteSO: async (ids: string[]) => {
    const { error } = await supabaseManual.from("sales_order").delete().in("id", ids);
    if (error) throw new Error(error.message || "Gagal hapus SO masal");
    return [];
  },
  getLastSONo: async () => {
    try {
      const { data, error } = await supabaseManual.from("sales_order")
        .select("order_id")
        .neq("order_id", "");
      if (error) throw error;
      // Parse all order_ids (handles both old SJM.ID-0.292.26 and new SJM.ID-0293.26 formats)
      // Regex: last numeric segment before the 2-digit year suffix
      const re = /SJM\.ID-(?:\d+\.)*(\d+)\.(\d{2})$/;
      let maxNum = 0;
      let maxId = "";
      (data || []).forEach((r: any) => {
        const m = (r.order_id || "").match(re);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) { maxNum = num; maxId = r.order_id; }
        }
      });
      return maxId ? [{ order_id: maxId }] : [];
    } catch (e) { console.error('getLastSONo', e); return []; }
  },

  getArmada: async () => {
    const { data, error } = await supabaseManual.from("armada").select("*").order("no_polisi", { ascending: true });
    if (error) { console.error("getArmada", error); return []; }
    return (data || []).map((a: any) => ({
      ...a,
      posisi_log: Array.isArray(a.posisi_log) ? a.posisi_log : []
    }));
  },
  addArmada: async (d: any) => {
    const { data, error } = await supabaseManual.from("armada").insert([d]).select();
    if (error) throw new Error(error.message || "Gagal tambah armada");
    return data[0];
  },
  updateArmada: async (id: string, d: any) => {
    const { error } = await supabaseManual.from("armada").update(d).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update armada");
  },
  deleteArmada: async (id: string) => {
    const { error } = await supabaseManual.from("armada").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus armada");
  },
  getArmadaDokumen: async () => {
    const { data, error } = await supabaseManual.from("armada_dokumen").select("*").order("tgl_expired", { ascending: true });
    if (error) { console.error("getArmadaDokumen", error); return []; }
    return data || [];
  },
  addArmadaDokumen: async (d: any) => {
    const { data, error } = await supabaseManual.from("armada_dokumen").insert([d]).select();
    if (error) throw new Error(error.message || "Gagal tambah dokumen");
    return data[0];
  },
  updateArmadaDokumen: async (id: string, d: any) => {
    const { error } = await supabaseManual.from("armada_dokumen").update(d).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update dokumen");
  },
  deleteArmadaDokumen: async (id: string) => {
    const { error } = await supabaseManual.from("armada_dokumen").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus dokumen");
  },
  getArmadaService: async () => {
    const { data, error } = await supabaseManual.from("armada_service").select("*").order("tgl_service", { ascending: false });
    if (error) { console.error("getArmadaService", error); return []; }
    return data || [];
  },
  addArmadaService: async (d: any) => {
    const { data, error } = await supabaseManual.from("armada_service").insert([d]).select();
    if (error) throw new Error(error.message || "Gagal tambah service");
    return data[0];
  },
  deleteArmadaService: async (id: string) => {
    const { error } = await supabaseManual.from("armada_service").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus service");
  },
  getSopir: async () => {
    const { data, error } = await supabaseManual.from("sopir").select("*").order("nama", { ascending: true });
    if (error) { console.error("getSopir", error); return []; }
    return data || [];
  },
  addSopir: async (d: any) => {
    const { data, error } = await supabaseManual.from("sopir").insert([d]).select();
    if (error) throw new Error(error.message || "Gagal tambah sopir");
    return data[0];
  },
  updateSopir: async (id: string, d: any) => {
    const { error } = await supabaseManual.from("sopir").update(d).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update sopir");
  },
  deleteSopir: async (id: string) => {
    const { error } = await supabaseManual.from("sopir").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus sopir");
  },

  getLogs: async () => {
    const { data, error } = await supabaseManual.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { console.error("[getLogs] error:", JSON.stringify(error)); return []; }
    return data || [];
  },
  addLog: async (log: any) => {
    const { data, error } = await supabaseManual.from("audit_logs").insert([log]).select();
    if (error) {
      console.error("[addLog] gagal insert ke audit_logs:", JSON.stringify(error));
      // Jangan throw — logAction bukan operasi kritis, tidak boleh crash app
    }
    return data ? data[0] : null;
  },
  getLastInvoiceNo: async (): Promise<number> => {
    const extractNum = (str: string): number => {
      const m = (str || '').match(/^(\d+)\//);
      return m ? parseInt(m[1], 10) : 0;
    };
    const [invRes, soRes] = await Promise.all([
      supabaseManual.from('invoices').select('no_invoice'),
      supabaseManual.from('sales_order').select('no_invoice'),
    ]);
    let max = 0;
    (invRes.data || []).forEach((r: any) => { const n = extractNum(r.no_invoice); if (n > max) max = n; });
    (soRes.data  || []).forEach((r: any) => { const n = extractNum(r.no_invoice); if (n > max) max = n; });
    return max;
  },
  addInvoice: async (invoice: {
    no_invoice: string;
    tgl_invoice: string;
    customer: string;
    pic_cust: string;
    so_ids: string[];
    so_order_ids: string[];
    total_sebelum_pajak: number;
    ppn: number;
    total_setelah_pajak: number;
    tipe: 'normal' | 'dp' | 'pelunasan';
    keterangan_invoice?: string;
    [key: string]: any;
  }) => {
    const { data: res, error } = await supabase.from("invoices").insert([{
      no_invoice:          invoice.no_invoice,
      tgl_invoice:         invoice.tgl_invoice,
      customer:            invoice.customer,
      pic_cust:            invoice.pic_cust,
      so_ids:              invoice.so_ids,
      so_order_ids:        invoice.so_order_ids,
      total_sebelum_pajak: invoice.total_sebelum_pajak,
      ppn:                 invoice.ppn,
      total_setelah_pajak: invoice.total_setelah_pajak,
      tipe:                invoice.tipe || 'normal',
      keterangan_invoice:  invoice.keterangan_invoice || '',
      status_bayar:        'Belum Bayar',
      total_terbayar:      0,
    }]).select();
    if (error) throw new Error(error.message || "Gagal simpan invoice");
    return res?.[0];
  },
  updateSOInvoiceNo: async (ids: string[], no_invoice: string) => {
    for (const id of ids) {
      const { error } = await supabaseManual.from("sales_order").update({ no_invoice }).eq("id", id);
      if (error) throw new Error(error.message || "Gagal update no_invoice SO");
    }
  },
  getInvoices: async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || "Gagal ambil data invoice");
    return data || [];
  },
  getInvoicesBySO: async (orderIds: string[]) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .overlaps('so_order_ids', orderIds)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || "Gagal ambil invoice SO");
    return data || [];
  },
  getPaymentStatusRPC: async (soOrderIds: string[]) => {
    const { data, error } = await supabase.rpc(
      'get_invoice_payment_status',
      { p_so_order_ids: soOrderIds }
    );
    if (error) throw new Error(error.message || "Gagal cek status pembayaran");
    return data;
  },
  updateSOInvoiceCount: async (soId: string, count: number) => {
    const { error } = await supabase
      .from('sales_order')
      .update({ invoice_count: count })
      .eq('id', soId);
    if (error) throw new Error(error.message || "Gagal update invoice count");
  },
  getPaymentStatus: async (soOrderIds: string[]) => {
    const { data, error } = await supabase.rpc(
      'get_invoice_payment_status',
      { p_so_order_ids: soOrderIds }
    );
    if (error) throw new Error(error.message || "Gagal cek status pembayaran");
    return data?.[0] || {
      total_invoiced: 0, total_paid: 0, total_remaining: 0,
      status: 'Belum Bayar', is_overpaid: false,
    };
  },
  getPaymentStatusBatch: async (noInvoices: string[]) => {
    const { data, error } = await supabase.rpc(
      'get_payment_status_batch',
      { p_no_invoices: noInvoices }
    );
    if (error) throw new Error(error.message || 'Gagal cek status pembayaran batch');
    // Return sebagai map: no_invoice -> status data
    const map: Record<string, any> = {};
    (data || []).forEach((row: any) => { map[row.no_invoice] = row; });
    return map;
  },
  updateInvoiceStatus: async (id: string, statusBayar: string, totalTerbayar: number) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status_bayar: statusBayar, total_terbayar: totalTerbayar })
      .eq('id', id);
    if (error) throw new Error(error.message || "Gagal update status invoice");
  },

  updateInvoiceStatusBatch: async (updates: Array<{id: string, status_bayar: string}>) => {
    for (const u of updates) {
      await supabase.from('invoices').update({ status_bayar: u.status_bayar }).eq('id', u.id);
    }
  },
  deleteInvoice: async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Gagal hapus invoice');
  },

  updateInvoiceDokumen: async (id: string, data: {
    gdrive_url?: string;
    ekspedisi?: string;
    no_resi?: string;
    tgl_kirim?: string;
    status_dokumen?: string;
  }) => {
    const { error } = await supabase
      .from('invoices')
      .update(data)
      .eq('id', id);
    if (error) throw new Error(error.message || 'Gagal update dokumen invoice');
  },

  getQuotations: async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  addQuotation: async (q: any) => {
    const { data, error } = await supabase
      .from('quotations')
      .insert([q])
      .select();
    if (error) throw new Error(error.message);
    return data?.[0];
  },

  updateQuotation: async (id: string, updates: any) => {
    const { error } = await supabase
      .from('quotations')
      .update(updates)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  deleteQuotation: async (id: string) => {
    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  getLastQuotationNo: async (): Promise<number> => {
    const { data } = await supabase
      .from('quotations')
      .select('no_quotation');
    let max = 0;
    (data || []).forEach((r: any) => {
      const m = (r.no_quotation || '').match(/^(\d+)\//);
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    });
    return max;
  },
};

export const authActions = {
  signIn: async (username: string) => {
    const email = username.toLowerCase().trim() + "@sjm.internal";
    const { data, error } = await supabaseManual.from("user_profiles").select("*").eq("email", email).single();
    if (error || !data) throw new Error("Username tidak ditemukan");
    return { access_token: "ok", user: { id: data.id, email: data.email } };
  },
  signOut: async () => { },
  getProfile: async (userId: string | null, email?: string) => {
    if (email) {
      const { data } = await supabaseManual.from("user_profiles").select("*").eq("email", email).single();
      return data || null;
    }
    const { data } = await supabaseManual.from("user_profiles").select("*").eq("id", userId).single();
    return data || null;
  },
  getAllUsers: async () => {
    const { data, error } = await supabaseManual.from("user_profiles").select("*").order("nama", { ascending: true });
    if (error) { console.error("getAllUsers", error); return []; }
    return data || [];
  },
  updateUserRole: async (id: string, role: string) => {
    const { error } = await supabaseManual.from("user_profiles").update({ role }).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update role");
    return [];
  },
  updateUserStatus: async (id: string, status: string) => {
    const { error } = await supabaseManual.from("user_profiles").update({ status }).eq("id", id);
    if (error) throw new Error(error.message || "Gagal update status");
    return [];
  },
  inviteUser: async (username: string, nama: string, role: string, password?: string) => {
    const email = username.toLowerCase().trim() + "@sjm.internal";
    const { data: existing } = await supabaseManual.from("user_profiles").select("id").eq("email", email).single();
    if (existing) throw new Error(`Username "${username}" sudah dipakai`);
    const newUser = { nama, email, role, status: "Aktif", password: password || "SJM2026!" };
    const { data, error } = await supabaseManual.from("user_profiles").insert([newUser]).select();
    if (error) throw new Error(error.message || "Gagal buat user");
    return data ? data[0] : null;
  },
  deleteUser: async (id: string) => {
    const { error } = await supabaseManual.from("user_profiles").delete().eq("id", id);
    if (error) throw new Error(error.message || "Gagal hapus user");
  },
};
