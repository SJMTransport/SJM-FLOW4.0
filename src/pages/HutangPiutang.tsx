import React, { useState, useMemo } from "react";
import { C } from "@/src/constants";
import { fmt, fmtShort, filterByPeriod } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, statusBadge, PeriodFilter } from "@/src/components/SJMComponents";

export const HutangPiutangPage = ({ jurnal, coa, so, connected, onSOClick }: any) => {
  const [tab, setTab] = useState("piutang");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [search, setSearch] = useState("");

  // FIX: Dynamic COA lookup — cari kode akun Piutang & Hutang dari COA master
  // Tidak hardcode "112"/"211" lagi
  const piutangKodes = useMemo(() => {
    const set = new Set<string>();
    (coa || []).forEach((c: any) => {
      const nama = (c.nama || "").toLowerCase();
      const kode = c.kode || "";
      if (
        nama.includes("piutang usaha") ||
        nama.includes("piutang dagang") ||
        kode === "112" || kode.startsWith("112")
      ) set.add(kode);
    });
    // Fallback kalau COA kosong
    if (set.size === 0) set.add("112");
    return set;
  }, [coa]);

  const hutangKodes = useMemo(() => {
    const set = new Set<string>();
    (coa || []).forEach((c: any) => {
      const nama = (c.nama || "").toLowerCase();
      const kode = c.kode || "";
      if (
        nama.includes("hutang usaha") ||
        nama.includes("hutang dagang") ||
        kode === "211" || kode.startsWith("211")
      ) set.add(kode);
    });
    if (set.size === 0) set.add("211");
    return set;
  }, [coa]);

  const piutangRows = useMemo(() => {
    const map: any = {};
    filterByPeriod(jurnal, period).forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (!piutangKodes.has(d.coa_kode)) return;
        const key = j.no_so || j.id;
        if (!map[key]) {
          map[key] = { key, no_so: j.no_so, tanggal: j.tanggal, keterangan: j.keterangan, debit: 0, kredit: 0 };
        }
        map[key].debit += Number(d.debit);
        map[key].kredit += Number(d.kredit);
      });
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      saldo: r.debit - r.kredit,
      status: (r.debit - r.kredit) <= 0 ? "Lunas" : r.kredit > 0 ? "Parsial" : "Belum Lunas",
    }));
  }, [jurnal, period, piutangKodes]);

  const hutangRows = useMemo(() => {
    const map: any = {};
    filterByPeriod(jurnal, period).forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (!hutangKodes.has(d.coa_kode)) return;
        const key = j.no_so || j.id;
        if (!map[key]) {
          map[key] = { key, no_so: j.no_so, tanggal: j.tanggal, keterangan: j.keterangan, debit: 0, kredit: 0 };
        }
        map[key].debit += Number(d.debit);
        map[key].kredit += Number(d.kredit);
      });
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      saldo: r.kredit - r.debit,
      status: (r.kredit - r.debit) <= 0 ? "Lunas" : r.debit > 0 ? "Parsial" : "Belum Lunas",
    }));
  }, [jurnal, period, hutangKodes]);

  const rows = tab === "piutang" ? piutangRows : hutangRows;
  const filtered = rows.filter((r: any) =>
    !search ||
    r.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
    r.no_so?.toLowerCase().includes(search.toLowerCase())
  );

  const totalTagih = filtered.reduce((s: number, r: any) => s + (tab === "piutang" ? r.debit : r.kredit), 0);
  const totalBayar = filtered.reduce((s: number, r: any) => s + (tab === "piutang" ? r.kredit : r.debit), 0);
  const totalSaldo = filtered.reduce((s: number, r: any) => s + r.saldo, 0);

  const outstanding = filtered.filter((r: any) => r.status !== "Lunas");

  return (
    <div className="fade-up">
      <SectionHeader title="Hutang & Piutang" sub="Data otomatis dari jurnal" />

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[["piutang", "Piutang Usaha"], ["hutang", "Hutang Usaha"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Tagihan" value={fmtShort(totalTagih)} color={C.blue} />
        <StatCard label="Sudah Dibayar" value={fmtShort(totalBayar)} color={C.green} />
        <StatCard label="Sisa Outstanding" value={fmtShort(totalSaldo)} color={C.red} />
        <StatCard label="Belum Lunas" value={`${outstanding.length} item`} color={totalSaldo > 0 ? C.red : C.green} />
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ maxHeight: "calc(100vh - 420px)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>TANGGAL</th>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>NO SO</th>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>KETERANGAN</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>{tab === "piutang" ? "JUMLAH TAGIHAN" : "JUMLAH HUTANG"}</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>SISA OUTSTANDING</th>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: C.textLight }}>
                  Belum ada data {tab}
                </td></tr>
              )}
              {filtered.map((r: any, i: number) => (
                <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px" }}>{r.tanggal}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.no_so
                      ? <span className="chip-so" onClick={() => onSOClick && onSOClick(r.no_so)} style={{ cursor: "pointer" }}>{r.no_so}</span>
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>{r.keterangan}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    {fmt(tab === "piutang" ? r.debit : r.kredit)}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: r.saldo > 0 ? C.red : C.green }}>
                    {fmt(r.saldo)}
                  </td>
                  <td style={{ padding: "10px 14px" }}>{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
