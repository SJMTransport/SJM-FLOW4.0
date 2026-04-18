import React, { useState, useMemo } from "react";
import { C } from "@/src/constants";
import { fmt, fmtShort, filterByPeriod } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, statusBadge, PeriodFilter } from "@/src/components/SJMComponents";

export const HutangPiutangPage = ({ jurnal, coa, so, connected, onSOClick }: any) => {
  const [tab, setTab] = useState("piutang");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [search, setSearch] = useState("");

  const piutangRows = useMemo(() => {
    const map: any = {};
    filterByPeriod(jurnal, period).forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (d.coa_kode !== "112") return;
        const key = j.no_so || j.id;
        if (!map[key]) {
          map[key] = {
            key, no_so: j.no_so, tanggal: j.tanggal, keterangan: j.keterangan,
            debit: 0, kredit: 0
          };
        }
        map[key].debit += Number(d.debit);
        map[key].kredit += Number(d.kredit);
      });
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      saldo: r.debit - r.kredit,
      status: (r.debit - r.kredit) <= 0 ? "Lunas" : r.kredit > 0 ? "Parsial" : "Belum Lunas"
    }));
  }, [jurnal, period]);

  const hutangRows = useMemo(() => {
    const map: any = {};
    filterByPeriod(jurnal, period).forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (d.coa_kode !== "211") return; // Hutang Usaha
        const key = j.no_so || j.id;
        if (!map[key]) {
          map[key] = {
            key, no_so: j.no_so, tanggal: j.tanggal, keterangan: j.keterangan,
            debit: 0, kredit: 0
          };
        }
        map[key].debit += Number(d.debit);
        map[key].kredit += Number(d.kredit);
      });
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      saldo: r.kredit - r.debit, // Normal credit balance for liability
      status: (r.kredit - r.debit) <= 0 ? "Lunas" : r.debit > 0 ? "Parsial" : "Belum Lunas"
    }));
  }, [jurnal, period]);

  const rows = tab === "piutang" ? piutangRows : hutangRows;
  const filtered = rows.filter((r: any) => 
    !search || r.keterangan?.toLowerCase().includes(search.toLowerCase()) || r.no_so?.toLowerCase().includes(search.toLowerCase())
  );

  const totalTagih = filtered.reduce((s, r: any) => s + (tab === "piutang" ? r.debit : r.kredit), 0);
  const totalBayar = filtered.reduce((s, r: any) => s + (tab === "piutang" ? r.kredit : r.debit), 0);
  const totalSaldo = filtered.reduce((s, r: any) => s + r.saldo, 0);

  return (
    <div className="fade-up">
      <SectionHeader title="Hutang & Piutang" sub="Data otomatis dari jurnal" />
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[["piutang", "Piutang Usaha"], ["hutang", "Hutang Usaha"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Tagihan" value={fmtShort(totalTagih)} color={C.blue} />
        <StatCard label="Sudah Dibayar" value={fmtShort(totalBayar)} color={C.green} />
        <StatCard label="Sisa Outstanding" value={fmtShort(totalSaldo)} color={C.red} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Tanggal</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>No SO</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Keterangan</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>{tab === "piutang" ? "Jumlah Tagihan" : "Jumlah Hutang"}</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Sisa Outstanding</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any, i: number) => (
              <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px" }}>{r.tanggal}</td>
                <td style={{ padding: "10px 14px" }}>
                  {r.no_so ? <span className="chip-so" onClick={() => onSOClick && onSOClick(r.no_so)}>{r.no_so}</span> : "—"}
                </td>
                <td style={{ padding: "10px 14px" }}>{r.keterangan}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(tab === "piutang" ? r.debit : r.kredit)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: r.saldo > 0 ? C.red : C.green }}>{fmt(r.saldo)}</td>
                <td style={{ padding: "10px 14px" }}>{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
