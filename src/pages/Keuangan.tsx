import React, { useMemo, useState } from "react";
import { C } from "@/src/constants";
import { fmt, filterByPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, StatCard, PeriodFilter } from "@/src/components/SJMComponents";

export const KeuanganPage = ({ activeSub, jurnal, coa, so, connected }: any) => {
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [search, setSearch] = useState("");

  // ─── FIX: semua useMemo dipindah ke atas, di luar conditional ───────────
  // Hutang Vendor rows
  const vendorRows = useMemo(() => {
    if (activeSub !== "hutangvendor") return [];
    return filterByPeriod(jurnal, period)
      .flatMap((j: any) => (j.jurnal_detail || [])
        .filter((d: any) => d.coa_kode.startsWith("211") && d.coa_kode !== "211")
        .map((d: any) => ({ ...d, tanggal: j.tanggal, no_jurnal: j.no_jurnal, keterangan: j.keterangan }))
      )
      .filter((r: any) =>
        !search ||
        r.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
        coa.find((c: any) => c.kode === r.coa_kode)?.nama?.toLowerCase().includes(search.toLowerCase())
      );
  }, [activeSub, jurnal, period, search, coa]);

  // Rekap UJ rows — gunakan COA kelompok "Beban" dengan nama mengandung "Uang Jalan"
  // bukan hardcode "511", cari dinamis dari COA
  const ujCoaKodes = useMemo(() => {
    const set = new Set<string>();
    (coa || []).forEach((c: any) => {
      if (
        (c.nama || "").toLowerCase().includes("uang jalan") ||
        (c.nama || "").toLowerCase().includes("uj") ||
        c.kode === "511"
      ) set.add(c.kode);
    });
    return set;
  }, [coa]);

  const ujData = useMemo(() => {
    if (activeSub !== "rekapuj") return [];
    return (so || [])
      .filter((s: any) => s.status_muatan !== "Cancelled")
      .filter((s: any) =>
        !search ||
        s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.no_polisi?.toLowerCase().includes(search.toLowerCase()) ||
        s.nama_sopir?.toLowerCase().includes(search.toLowerCase())
      )
      .map((s: any) => {
        const uj = jurnal
          .filter((j: any) => (j.keterangan || "").includes(s.order_id) || (j.no_so || "").includes(s.order_id))
          .flatMap((j: any) => (j.jurnal_detail || []))
          .filter((d: any) => ujCoaKodes.has(d.coa_kode))
          .reduce((sum: number, d: any) => sum + (Number(d.debit) - Number(d.kredit)), 0);
        return { ...s, uj };
      });
  }, [activeSub, so, jurnal, search, ujCoaKodes]);
  // ────────────────────────────────────────────────────────────────────────

  if (activeSub === "hutangvendor") {
    return (
      <div className="fade-up">
        <SectionHeader title="Hutang Vendor" sub="Rincian tagihan dari supplier/vendor" />
        <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TANGGAL</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>VENDOR (COA)</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>REF</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>DEBIT</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>KREDIT</th>
              </tr>
            </thead>
            <tbody>
              {vendorRows.length === 0 && <EmptyState colSpan={6} msg="Belum ada data hutang vendor" />}
              {vendorRows.map((r: any, i: number) => (
                <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px" }}>{r.tanggal}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {coa.find((c: any) => c.kode === r.coa_kode)?.nama || r.coa_kode}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.accent }}>{r.no_jurnal}</td>
                  <td style={{ padding: "12px 16px" }}>{r.keterangan}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>{r.debit > 0 ? fmt(r.debit) : "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: C.red }}>{r.kredit > 0 ? fmt(r.kredit) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "cicilan") {
    return (
      <div className="fade-up">
        <SectionHeader title="Cicilan & Pinjaman" sub="Monitoring kewajiban bank/leasing" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Pinjaman Aktif</div>
            <div style={{ padding: 20, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.textLight }}>
              Belum ada data pinjaman terdaftar
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Jadwal Bayar Terdekat</div>
            <div style={{ padding: 20, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.textLight }}>
              Semua cicilan bulan ini sudah lunas
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSub === "rekapuj") {
    return (
      <div className="fade-up">
        <SectionHeader title="Rekap Uang Jalan" sub="Monitoring pengeluaran operasional per unit" />
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" placeholder="○ Cari SO, unit, atau sopir..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL MUAT</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>ORDER ID</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>UNIT (NOPOL)</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>SOPIR</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>UANG JALAN</th>
              </tr>
            </thead>
            <tbody>
              {ujData.length === 0 && <EmptyState colSpan={5} />}
              {ujData.map((r: any) => (
                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px" }}>{r.tgl_muat}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.order_id}</td>
                  <td style={{ padding: "12px 16px" }}>{r.no_polisi || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{r.nama_sopir || "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: r.uj > 0 ? C.text : C.textLight }}>
                    {r.uj > 0 ? fmt(r.uj) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>
      Fitur {activeSub} dalam pengembangan
    </div>
  );
};
