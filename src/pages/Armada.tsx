import React, { useState } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, statusBadge } from "@/src/components/SJMComponents";

export const ArmadaPage = ({ activeSub, armada, dokumen, service, sopir }: any) => {
  const [search, setSearch] = useState("");

  if (activeSub === "unit") {
    const filtered = (armada || []).filter((a: any) => !search || a.no_polisi?.toLowerCase().includes(search.toLowerCase()) || a.merk?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Armada" sub={`${armada.length} unit terdaftar`} action={<button className="btn-primary">+ Tambah Unit</button>} />
        <div style={{ marginBottom: 16 }}>
           <input className="input-field" placeholder="○ Cari no polisi atau merk..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
             <thead>
               <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>NO POLISI</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>JENIS</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>MERK</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>TAHUN</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>KEPEMILIKAN</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>STATUS</th>
                 <th style={{ padding: "12px 16px", textAlign: "center" }}>AKSI</th>
               </tr>
             </thead>
             <tbody>
               {filtered.length === 0 && <EmptyState colSpan={7} />}
               {filtered.map((r: any) => (
                 <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                   <td style={{ padding: "12px 16px", fontWeight: 700, color: C.accent }}>{r.no_polisi}</td>
                   <td style={{ padding: "12px 16px" }}>{r.jenis}</td>
                   <td style={{ padding: "12px 16px" }}>{r.merk}</td>
                   <td style={{ padding: "12px 16px" }}>{r.tahun}</td>
                   <td style={{ padding: "12px 16px" }}><span style={{ border: `1px solid ${C.blue}`, color: C.blue, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{r.kepemilikan || "SJM"}</span></td>
                   <td style={{ padding: "12px 16px" }}>{statusBadge(r.status || "Aktif")}</td>
                   <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }}>Edit</button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "dokumen") {
    const filtered = (dokumen || []).filter((d: any) => !search || d.no_polisi?.toLowerCase().includes(search.toLowerCase()) || d.nama_dokumen?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Dokumen Armada" sub="Tracking STNK, KIR, Izin, dll" action={<button className="btn-primary">+ Register Dokumen</button>} />
        <div style={{ marginBottom: 16 }}>
           <input className="input-field" placeholder="○ Cari unit atau nama dokumen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>UNIT</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA DOKUMEN</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL EXPIRED</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>STATUS</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <EmptyState colSpan={5} />}
              {filtered.map((r: any) => {
                const isExp = new Date(r.tgl_expired) < new Date();
                return (
                  <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.no_polisi}</td>
                    <td style={{ padding: "12px 16px" }}>{r.nama_dokumen}</td>
                    <td style={{ padding: "12px 16px", color: isExp ? C.red : C.text, fontWeight: isExp ? 700 : 400 }}>{r.tgl_expired}</td>
                    <td style={{ padding: "12px 16px" }}>
                       <span style={{ background: isExp ? C.redLight : C.greenLight, color: isExp ? C.red : C.green, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                          {isExp ? "Expired" : "OK"}
                       </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: C.textLight }}>{r.keterangan || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "service") {
    const filtered = (service || []).filter((s: any) => !search || s.no_polisi?.toLowerCase().includes(search.toLowerCase()) || s.jenis_service?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Riwayat Service" sub="Maintenance rutin unit" action={<button className="btn-primary">+ Catat Service</button>} />
        <div style={{ marginBottom: 16 }}>
           <input className="input-field" placeholder="○ Cari unit atau jenis service..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>UNIT</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TANGGAL</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>JENIS SERVICE</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>KM</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>BIAYA</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <EmptyState colSpan={6} />}
              {filtered.map((r: any) => (
                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.no_polisi}</td>
                  <td style={{ padding: "12px 16px" }}>{r.tgl_service}</td>
                  <td style={{ padding: "12px 16px" }}>{r.jenis_service}</td>
                  <td style={{ padding: "12px 16px" }}>{r.km_terakhir?.toLocaleString()} km</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>Rp {r.biaya?.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", color: C.textLight }}>{r.keterangan || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }
  if (activeSub === "sopir") {
    const filtered = (sopir || []).filter((s: any) => !search || s.nama?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Sopir" sub={`${sopir.length} sopir terdaftar`} action={<button className="btn-primary">+ Tambah Sopir</button>} />
        <div style={{ marginBottom: 16 }}>
           <input className="input-field" placeholder="○ Cari nama sopir..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
             <thead>
               <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>TELEPON</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>ALAMAT</th>
                 <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
               </tr>
             </thead>
             <tbody>
               {filtered.length === 0 && <EmptyState colSpan={4} />}
               {filtered.map((r: any) => (
                 <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                   <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.nama}</td>
                   <td style={{ padding: "12px 16px" }}>{r.telepon || "—"}</td>
                   <td style={{ padding: "12px 16px", color: C.textLight }}>{r.alamat || "—"}</td>
                   <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status || "Aktif")}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </Card>
      </div>
    );
  }

  return <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>Fitur {activeSub} dalam pengembangan</div>;
};
