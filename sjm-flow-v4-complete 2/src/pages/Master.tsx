import React, { useState } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, statusBadge } from "@/src/components/SJMComponents";
import { fmt } from "@/src/utils";

export const MasterPage = ({ activeSub, activeModule, coa, users, saldoAwal }: any) => {
  const [search, setSearch] = useState("");

  if (activeSub === "coa") {
    const filtered = (coa || []).filter((c: any) => !search || c.nama?.toLowerCase().includes(search.toLowerCase()) || c.kode?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Master COA" sub="Daftar akun perkiraan" action={<button className="btn-primary">+ Tambah Akun</button>} />
        <div style={{ marginBottom: 16 }}>
           <input className="input-field" placeholder="○ Cari kode atau nama akun..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
             <thead>
               <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>KODE</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA AKUN</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>KELOMPOK</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>SUB-KELOMPOK</th>
                 <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
               </tr>
             </thead>
             <tbody>
               {filtered.length === 0 && <EmptyState colSpan={5} />}
               {filtered.map((r: any) => (
                 <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                   <td style={{ padding: "12px 16px", fontWeight: 700, color: C.accent }}>{r.kode}</td>
                   <td style={{ padding: "12px 16px" }}>{r.nama}</td>
                   <td style={{ padding: "12px 16px" }}>{r.kelompok}</td>
                   <td style={{ padding: "12px 16px", color: C.textLight }}>{r.sub_kelompok}</td>
                   <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status || "Aktif")}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "saldoawal") {
    return (
      <div className="fade-up">
        <SectionHeader title="Saldo Awal" sub="Input saldo awal akun per periode" action={<button className="btn-primary">Update Saldo</button>} />
        <Card style={{ padding: 0, overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
             <thead>
               <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>KODE</th>
                 <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA AKUN</th>
                 <th style={{ padding: "12px 16px", textAlign: "right" }}>DEBIT</th>
                 <th style={{ padding: "12px 16px", textAlign: "right" }}>KREDIT</th>
               </tr>
             </thead>
             <tbody>
               {coa.filter((c: any) => c.status === "Aktif").map((c: any) => {
                 const sa = saldoAwal.find((s: any) => s.coa_kode === c.kode);
                 return (
                   <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                     <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.kode}</td>
                     <td style={{ padding: "12px 16px" }}>{c.nama}</td>
                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <input className="input-field" type="number" defaultValue={sa?.debit || 0} style={{ textAlign: "right", width: 140 }} />
                     </td>
                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <input className="input-field" type="number" defaultValue={sa?.kredit || 0} style={{ textAlign: "right", width: 140 }} />
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "users") {
    const filtered = (users || []).filter((u: any) => !search || u.nama?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Manajemen User" sub="Akun internal SJM" action={<button className="btn-primary">+ Undang User</button>} />
        <div style={{ marginBottom: 16 }}>
           <input className="input-field" placeholder="○ Cari nama atau email user..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>EMAIL</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>ROLE</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.nama}</td>
                  <td style={{ padding: "12px 16px", color: C.textLight }}>{r.email}</td>
                  <td style={{ padding: "12px 16px" }}>{r.role}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status || "Aktif")}</td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyState colSpan={4} />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "password") {
    return (
      <div className="fade-up" style={{ maxWidth: 400, margin: "0 auto" }}>
        <SectionHeader title="Ganti Password" sub="Keamanan akun Anda" />
        <Card>
           <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Password Lama</label>
              <input className="input-field" type="password" />
           </div>
           <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Password Baru</label>
              <input className="input-field" type="password" />
           </div>
           <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Konfirmasi Password Baru</label>
              <input className="input-field" type="password" />
           </div>
           <button className="btn-primary" style={{ width: "100%" }}>Update Password</button>
        </Card>
      </div>
    );
  }

  return <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>Fitur {activeSub} dalam pengembangan</div>;
};
