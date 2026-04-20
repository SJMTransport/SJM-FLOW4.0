import React, { useState, useEffect, useCallback } from "react";
import { 
    APP_NAME, APP_TAGLINE, APP_VERSION, APP_COMPANY, C, ROLE_COLOR, ROLE_BG 
} from "@/src/constants";
import { 
    fmt, filterByPeriod, filterUpToPeriod 
} from "@/src/utils";
import { api, authActions } from "@/src/api";
import { SectionHeader, DBBanner, Icon, statusBadge } from "@/src/components/SJMComponents";
import { Dashboard } from "@/src/pages/Dashboard";
import { JurnalUmum } from "@/src/pages/JurnalUmum";
import { SalesOrderPage } from "@/src/pages/SalesOrder";
import { OperasionalPage } from "@/src/pages/Operasional";

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }: any) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!username.trim()) return setErr("Username wajib diisi");
    setLoading(true);
    try {
      const session = await authActions.signIn(username);
      const profile = await authActions.getProfile(null, session.user.email);
      if (!profile) throw new Error("Akun tidak ditemukan");
      if (profile.status === "Nonaktif") throw new Error("Akun tidak aktif. Hubungi Admin.");
      onLogin({ session, profile });
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 auto 14px" }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-0.02em" }}>SJM Flow</div>
          <div style={{ fontSize: 12, color: C.sideTextMuted, marginTop: 3 }}>{APP_COMPANY} · {APP_VERSION}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 22 }}>Masuk ke akun</div>
          <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" onKeyDown={e => e.key === "Enter" && submit()} style={{ marginBottom: 16 }} />
          {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: "100%" }}>{loading ? "Memverifikasi..." : "Masuk →"}</button>
        </div>
      </div>
    </div>
  );
};

import { HutangPiutangPage } from "@/src/pages/HutangPiutang";
import { KeuanganPage } from "@/src/pages/Keuangan";
import { UpdateMuatan } from "@/src/pages/UpdateMuatan";
import { ApprovalPage } from "@/src/pages/ApprovalPage";
import { KontakPage } from "@/src/pages/Kontak";
import { LaporanPage } from "@/src/pages/Laporan";
import { ArmadaPage } from "@/src/pages/Armada";
import { MasterPage } from "@/src/pages/Master";
import { useConfirm } from "@/src/components/SJMComponents";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [activeSub, setActiveSub] = useState("default");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [jurnal, setJurnal] = useState([]);
  const [so, setSo] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [piutang, setPiutang] = useState([]);
  const [coa, setCoa] = useState([]);
  const [armada, setArmada] = useState([]);
  const [armadaDokumen, setArmadaDokumen] = useState([]);
  const [armadaService, setArmadaService] = useState([]);
  const [sopir, setSopir] = useState([]);
  const [users, setUsers] = useState([]);
  const [saldoAwal, setSaldoAwal] = useState([]);
  const [globalSODetail, setGlobalSODetail] = useState<any>(null);
  const [globalJurnalDetail, setGlobalJurnalDetail] = useState<any>(null);
  const [globalArmadaDetail, setGlobalArmadaDetail] = useState<any>(null);

  const handleLogin = ({ session, profile }: any) => {
    setSession(session); setCurrentUser(profile);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, j, s, cu, p, arm, armD, armS, sop, usr, sa] = await Promise.all([
        api.getCoa(), api.getJurnal(), api.getSO(), api.getCustomer(), 
        api.getPiutang(), api.getArmada(), api.getArmadaDokumen(), api.getArmadaService(),
        api.getSopir(), authActions.getAllUsers(), api.getSaldoAwal()
      ]);
      setCoa(c); setJurnal(j); setSo(s); setCustomer(cu); setPiutang(p || []);
      setArmada(arm); setArmadaDokumen(armD); setArmadaService(armS); setSopir(sop); setUsers(usr); setSaldoAwal(sa);
      setConnected(true);
    } catch (e) { console.error(e); setConnected(false); }
    setLoading(false);
  };

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  const handleSOClick = useCallback((id: string) => {
    const s = (so || []).find((x: any) => x.order_id === id);
    if (s) setGlobalSODetail(s);
  }, [so]);

  const handleJurnalClick = useCallback((no: string) => {
    const j = (jurnal || []).find((x: any) => x.no_jurnal === no);
    if (j) setGlobalJurnalDetail(j);
  }, [jurnal]);

  const handleArmadaClick = useCallback((noPol: string) => {
    const a = (armada || []).find((x: any) => x.no_polisi === noPol);
    if (a) setGlobalArmadaDetail(a);
  }, [armada]);

  const handleLogout = async () => {
    await authActions.signOut?.().catch(() => {});
    setSession(null);
    setCurrentUser(null);
  };

  if (!session || !currentUser) return <LoginPage onLogin={handleLogin} />;

  const NAV_MODULES = [
    { key: "dashboard", label: "Dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", subs: [] },
    { 
      key: "operasional", label: "Operasional", icon: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", 
      subs: [
        { key: "so", label: "Sales Order" },
        { key: "updatemuatan", label: "Update Muatan" },
        { key: "quotation", label: "Quotation" },
        { key: "invoice", label: "Invoice" }
      ]
    },
    { 
      key: "keuangan", label: "Keuangan", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", 
      subs: [
        { key: "persetujuan", label: "Persetujuan Jurnal" },
        { key: "jurnal", label: "Jurnal Umum" },
        { key: "hutangpiutang", label: "Hutang & Piutang" },
        { key: "hutangvendor", label: "Hutang Vendor" },
        { key: "cicilan", label: "Cicilan" },
        { key: "rekapuj", label: "Rekap UJ" }
      ]
    },
    { 
      key: "laporan", label: "Laporan", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3", 
      subs: [
        { key: "neraca", label: "Neraca" },
        { key: "labarugi", label: "Laba Rugi" },
        { key: "bukubesar", label: "Buku Besar" },
        { key: "profit", label: "Profitabilitas" },
        { key: "export", label: "Export" },
        { key: "perunit", label: "Per Unit" }
      ]
    },
    { 
      key: "armada", label: "Armada", icon: "M18.36 6.64a9 9 0 1 1-12.73 0", 
      subs: [
        { key: "unit", label: "Unit" },
        { key: "dokumen", label: "Dokumen" },
        { key: "service", label: "Service" },
        { key: "sopir", label: "Sopir" }
      ]
    },
    { 
      key: "master", label: "Master", icon: "M12 15V3m0 12l-4-4m4 4l4-4", 
      subs: [
        { key: "kontak", label: "Kontak" },
        { key: "coa", label: "Master COA" },
        { key: "saldoawal", label: "Saldo Awal" },
        { key: "users", label: "Users" },
        { key: "password", label: "Password" }
      ]
    },
  ];

  const handleNav = (mod: string, sub?: string) => {
    setActiveModule(mod);
    setActiveSub(sub || "default");
  };

  const currentModule = NAV_MODULES.find(m => m.key === activeModule);
  if (currentModule && activeSub === "default" && currentModule.subs.length > 0) {
    setActiveSub(currentModule.subs[0].key);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "#fff", borderRight: "1px solid #F0F0F0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #F5F5F5" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{APP_NAME}</div>
        </div>
        <nav style={{ flex: 1, padding: "8px 6px" }}>
          {NAV_MODULES.map(item => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              className={`nav-item ${activeModule === item.key ? "active" : ""}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "none", borderRadius: 7, cursor: "pointer", marginBottom: 2, background: activeModule === item.key ? C.accentLight : "transparent", color: activeModule === item.key ? C.accent : "#6B7280", fontSize: 13, textAlign: "left", fontWeight: activeModule === item.key ? 600 : 400 }}>
              <Icon d={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        {/* User info + logout */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #F0F0F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
              {(currentUser.nama || currentUser.email || "U")[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser.nama || currentUser.email}
              </div>
              <div style={{ fontSize: 10, color: C.textLight }}>{currentUser.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ width: "100%", padding: "7px 12px", background: "none", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.textMed, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMed; }}
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100vh", overflow: "hidden" }}>
        <header style={{ 
          background: "#fff", 
          borderBottom: `1px solid ${C.sideBorder}`, 
          padding: "0 24px", 
          height: 50, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          zIndex: 50,
          flexShrink: 0
        }}>
           <div style={{ fontSize: 12, color: C.sideTextMuted, display: "flex", gap: 6, alignItems: "center" }}>
              <span>{currentModule?.label}</span>
              {activeSub !== "default" && <span>/ {currentModule?.subs.find(s => s.key === activeSub)?.label}</span>}
           </div>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: ROLE_BG[currentUser.role], color: ROLE_COLOR[currentUser.role], padding: "2px 10px", borderRadius: 5, fontSize: 11, fontWeight: 500 }}>{currentUser.role}</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#22C55E" : "#DC2626", border: "2px solid #fff", boxShadow: "0 0 0 1px #eee" }} />
           </div>
        </header>

        {/* Sub Navigation Tabs */}
        {currentModule && currentModule.subs.length > 0 && (
          <div style={{ 
            background: "#fff", 
            borderBottom: `1px solid ${C.sideBorder}`, 
            padding: "0 24px", 
            display: "flex", 
            gap: 0,
            zIndex: 49,
            flexShrink: 0
          }}>
             {currentModule.subs.map(sub => (
               <button key={sub.key} onClick={() => setActiveSub(sub.key)}
                 className={`tab-btn ${activeSub === sub.key ? "active" : ""}`}
                 style={{ 
                   padding: "12px 20px", fontSize: 13, border: "none", background: "none", cursor: "pointer", 
                   color: activeSub === sub.key ? C.accent : C.textMed,
                   borderBottom: `2px solid ${activeSub === sub.key ? C.accent : "transparent"}`,
                   fontWeight: activeSub === sub.key ? 600 : 400,
                   transition: "0.2s"
                 }}>
                 {sub.label}
               </button>
             ))}
          </div>
        )}
        
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {activeModule === "dashboard" && <Dashboard jurnal={jurnal} so={so} coa={coa} piutang={piutang} armadaDokumen={armadaDokumen} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} onNavigate={(path: string) => handleNav("keuangan", path)} />}
          
          {activeModule === "operasional" && (
            <>
              {activeSub === "so" && <SalesOrderPage so={so} setSo={setSo} jurnal={jurnal} customer={customer} armada={armada} sopir={sopir} currentUser={currentUser} onSOClick={handleSOClick} />}
              {activeSub === "updatemuatan" && <UpdateMuatan so={so} setSo={setSo} onSOClick={handleSOClick} />}
              {["quotation", "invoice"].includes(activeSub) && (
                <OperasionalPage activeSub={activeSub} so={so} setSo={setSo} customer={customer} armada={armada} sopir={sopir} />
              )}
            </>
          )}

          {activeModule === "keuangan" && (
            <>
              {activeSub === "persetujuan" && <ApprovalPage jurnal={jurnal} setJurnal={setJurnal} currentUser={currentUser} onJurnalClick={handleJurnalClick} />}
              {activeSub === "jurnal" && <JurnalUmum jurnal={jurnal} setJurnal={setJurnal} coa={coa} so={so} connected={connected} currentUser={currentUser} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} />}
              {activeSub === "hutangpiutang" && <HutangPiutangPage jurnal={jurnal} coa={coa} so={so} connected={connected} onSOClick={handleSOClick} />}
              {["hutangvendor", "cicilan", "rekapuj"].includes(activeSub) && (
                <KeuanganPage activeSub={activeSub} jurnal={jurnal} coa={coa} so={so} connected={connected} />
              )}
            </>
          )}

          {activeModule === "laporan" && <LaporanPage activeSub={activeSub} jurnal={jurnal} coa={coa} so={so} armada={armada} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} />}
          {activeModule === "armada" && <ArmadaPage activeSub={activeSub} armada={armada} setArmada={setArmada} dokumen={armadaDokumen} setDokumen={setArmadaDokumen} service={armadaService} setService={setArmadaService} sopir={sopir} setSopir={setSopir} onArmadaClick={handleArmadaClick} />}
          
          {activeModule === "master" && (
            <>
              {activeSub === "kontak" && <KontakPage so={so} connected={connected} />}
              {["coa", "saldoawal", "users", "password"].includes(activeSub) && (
                 <MasterPage activeSub={activeSub} activeModule={activeModule} coa={coa} setCoa={setCoa} users={users} saldoAwal={saldoAwal} setSaldoAwal={setSaldoAwal} />
              )}
            </>
          )}
        </div>
      </div>

      {globalSODetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }} onClick={() => setGlobalSODetail(null)}>
           <div className="fade-left" style={{ width: 450, background: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Detail Sales Order</div>
                  <div style={{ fontSize: 12, color: C.textLight }}>Ref: {globalSODetail.order_id}</div>
                </div>
                <button className="btn-ghost" onClick={() => setGlobalSODetail(null)} style={{ fontSize: 20 }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <div style={{ display: "grid", gap: 20 }}>
                  <section>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>Informasi Utama</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Customer</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{globalSODetail.customer}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Status Muatan</div>
                        <div style={{ marginTop: 4 }}>{statusBadge(globalSODetail.status_muatan)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Posting Status</div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ 
                            fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                            background: globalSODetail.is_posted ? "#DCFCE7" : "#F1F5F9", 
                            color: globalSODetail.is_posted ? "#166534" : "#475569" 
                          }}>
                            {globalSODetail.is_posted ? "POSTED" : "DRAFT"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Lokasi Muat</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{globalSODetail.lokasi_muat}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Lokasi Bongkar</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{globalSODetail.lokasi_bongkar}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Tanggal Muat</div>
                        <div style={{ fontSize: 13 }}>{globalSODetail.tgl_muat}</div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>Logistik & Armada</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", background: C.bg, padding: 12, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Nomor Polisi</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{globalSODetail.no_polisi || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Sopir</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{globalSODetail.nama_sopir || "—"}</div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>Dokumen Pendukung</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: C.bg, borderRadius: 6 }}>
                           <span style={{ fontSize: 12, fontWeight: 600 }}>Bukti Muatan</span>
                           {globalSODetail.bukti_muatan ? (
                             <a href={globalSODetail.bukti_muatan} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>Buka Link ↗</a>
                           ) : (
                             <span style={{ fontSize: 11, color: C.textLight }}>Belum ada link</span>
                           )}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: C.bg, borderRadius: 6 }}>
                           <span style={{ fontSize: 12, fontWeight: 600 }}>Surat Jalan</span>
                           {globalSODetail.surat_jalan ? (
                             <a href={globalSODetail.surat_jalan} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>Buka Link ↗</a>
                           ) : (
                             <span style={{ fontSize: 11, color: C.textLight }}>Belum ada link</span>
                           )}
                        </div>
                    </div>
                  </section>

                  <section>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>Rincian Biaya</div>
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13 }}>Harga Satuan ({globalSODetail.tonase} ton)</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>@{(Number(globalSODetail.harga_per_ton) || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ padding: "12px 16px", background: C.bg, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                        <span>Total Tagihan</span>
                        <span style={{ color: C.blue }}>Rp {(Number(globalSODetail.total_harga_pajak || globalSODetail.total_harga) || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>Keterangan</div>
                    <div style={{ fontSize: 13, color: C.textMed, lineHeight: 1.5, background: "#FFFBEB", padding: 12, borderRadius: 8, border: "1px solid #FEF3C7", marginBottom: 20 }}>
                      {globalSODetail.keterangan || "Tidak ada keterangan tambahan."}
                    </div>
                  </section>

                  <section>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>Transaksi Jurnal Terkait</div>
                    {(() => {
                        const related = jurnal.filter((j: any) => 
                            (j.no_so || "").split(",").map((s: string) => s.trim()).includes(globalSODetail.order_id) ||
                            (j.no_invoice || "").split(",").map((s: string) => s.trim()).includes(globalSODetail.no_invoice)
                        );
                        if (related.length === 0) return <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: 16, border: `1px dashed ${C.border}`, borderRadius: 8 }}>Belum ada jurnal terkait</div>;
                        return (
                            <div style={{ display: "grid", gap: 10 }}>
                                {related.map((j: any) => (
                                    <div key={j.id} style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, color: C.accent }}>{j.no_jurnal}</span>
                                            <span style={{ color: C.textLight }}>{j.tanggal}</span>
                                        </div>
                                        <div style={{ color: C.textMed, marginBottom: 8 }}>{j.keterangan}</div>
                                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                                            {(j.jurnal_detail || []).map((d: any, di: number) => (
                                                <div key={di} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                                    <span style={{ paddingLeft: Number(d.kredit) > 0 ? 12 : 0 }}>{d.coa_kode} - {d.nama_akun}</span>
                                                    <span style={{ fontWeight: 600 }}>{fmt(Number(d.debit) > 0 ? d.debit : d.kredit)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                  </section>
                </div>
              </div>

              <div style={{ padding: 20, borderTop: `1px solid ${C.border}`, background: C.bg, display: "flex", gap: 10 }}>
                 <button className="btn-primary" style={{ flex: 1 }} onClick={() => setGlobalSODetail(null)}>Tutup Detail</button>
                 {["Admin", "Operasional"].includes(currentUser?.role) && (
                   <button className="btn-ghost" onClick={() => {
                     setGlobalSODetail(null);
                     // Navigate to SO page with edit mode
                     handleNav("operasional", "so");
                     setTimeout(() => {
                       window.dispatchEvent(new CustomEvent("sjm:editSO", { detail: globalSODetail }));
                     }, 100);
                   }}>
                     Edit SO
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {globalJurnalDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(2px)" }} onClick={() => setGlobalJurnalDetail(null)}>
           <div className="fade-up" style={{ width: 600, background: "#fff", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Detail Jurnal Umum</div>
                  <div style={{ fontSize: 12, color: C.textLight }}>Ref: {globalJurnalDetail.no_jurnal}</div>
                </div>
                <button className="btn-ghost" onClick={() => setGlobalJurnalDetail(null)} style={{ fontSize: 20 }}>✕</button>
              </div>

              <div style={{ padding: 24 }}>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Tanggal Jurnal</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{globalJurnalDetail.tanggal}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Tanggal Input</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(globalJurnalDetail.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>No. Sales Order</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{globalJurnalDetail.no_so || "—"}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Keterangan</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{globalJurnalDetail.keterangan}</div>
                    </div>
                 </div>

                 <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                                <th style={{ padding: "10px 14px", textAlign: "left" }}>Akun</th>
                                <th style={{ padding: "10px 14px", textAlign: "right" }}>Debit</th>
                                <th style={{ padding: "10px 14px", textAlign: "right" }}>Kredit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(globalJurnalDetail.jurnal_detail || []).map((d: any, i: number) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <td style={{ padding: "10px 14px", paddingLeft: Number(d.kredit) > 0 ? 32 : 14 }}>
                                        <div style={{ fontWeight: 600 }}>{d.coa_kode}</div>
                                        <div style={{ fontSize: 11, color: C.textLight }}>{d.nama_akun}</div>
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", color: C.green }}>{Number(d.debit) > 0 ? fmt(d.debit) : "—"}</td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", color: C.red }}>{Number(d.kredit) > 0 ? fmt(d.kredit) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ background: C.bg, fontWeight: 700 }}>
                            <tr>
                                <td style={{ padding: "10px 14px" }}>TOTAL</td>
                                <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(globalJurnalDetail.total_debit)}</td>
                                <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(globalJurnalDetail.total_kredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                 </div>
              </div>

              <div style={{ padding: 20, textAlign: "right", borderTop: `1px solid ${C.border}` }}>
                  <button className="btn-primary" onClick={() => setGlobalJurnalDetail(null)}>Tutup Detail</button>
              </div>
           </div>
        </div>
      )}

      {globalArmadaDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }} onClick={() => setGlobalArmadaDetail(null)}>
           <div className="fade-left" style={{ width: 600, background: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Detail Armada</div>
                  <div style={{ fontSize: 12, color: C.textLight }}>{globalArmadaDetail.no_polisi} — {globalArmadaDetail.nama_armada || "Tanpa Nama"}</div>
                </div>
                <button className="btn-ghost" onClick={() => setGlobalArmadaDetail(null)} style={{ fontSize: 20 }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <div style={{ display: "grid", gap: 24 }}>
                   <section>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 12 }}>Informasi Unit</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                         <div style={{ background: C.bg, padding: "10px 12px", borderRadius: 7 }}>
                            <div style={{ fontSize: 11, color: C.textLight }}>Merk & Jenis</div>
                            <div style={{ fontWeight: 600 }}>{globalArmadaDetail.merk} {globalArmadaDetail.jenis}</div>
                         </div>
                         <div style={{ background: C.bg, padding: "10px 12px", borderRadius: 7 }}>
                            <div style={{ fontSize: 11, color: C.textLight }}>Tahun</div>
                            <div style={{ fontWeight: 600 }}>{globalArmadaDetail.tahun || "—"}</div>
                         </div>
                         <div style={{ background: C.bg, padding: "10px 12px", borderRadius: 7 }}>
                            <div style={{ fontSize: 11, color: C.textLight }}>Kepemilikan</div>
                            <div style={{ fontWeight: 600 }}>{globalArmadaDetail.kepemilikan || "SJM"}</div>
                         </div>
                         <div style={{ background: C.bg, padding: "10px 12px", borderRadius: 7 }}>
                            <div style={{ fontSize: 11, color: C.textLight }}>Status</div>
                            <div style={{ marginTop: 2 }}>{statusBadge(globalArmadaDetail.status || "Aktif")}</div>
                         </div>
                      </div>
                   </section>

                   <section>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 12 }}>Log Perjalanan (Operasional)</div>
                      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead style={{ background: C.bg }}>
                                <tr>
                                    <th style={{ padding: 8, textAlign: "left" }}>Tgl</th>
                                    <th style={{ padding: 8, textAlign: "left" }}>Target</th>
                                    <th style={{ padding: 8, textAlign: "left" }}>Driver</th>
                                    <th style={{ padding: 8, textAlign: "right" }}>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const trips = so.filter((s: any) => s.no_polisi === globalArmadaDetail.no_polisi).sort((a: any, b: any) => b.tgl_order.localeCompare(a.tgl_order));
                                    if (trips.length === 0) return <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: C.textLight }}>Belum ada riwayat perjalanan</td></tr>;
                                    return trips.map((t: any) => (
                                        <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: 8 }}>{t.tgl_order}</td>
                                            <td style={{ padding: 8 }}>{t.customer}</td>
                                            <td style={{ padding: 8 }}>{t.nama_sopir}</td>
                                            <td style={{ padding: 8, textAlign: "right", fontWeight: 700 }}>{fmt(t.total_harga)}</td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                      </div>
                   </section>

                   <section>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 12 }}>Log Perbaikan & Maintenance</div>
                      <div style={{ display: "grid", gap: 10 }}>
                         {(() => {
                             const logs = armadaService.filter((s: any) => s.no_polisi === globalArmadaDetail.no_polisi).sort((a: any, b: any) => b.tgl_service.localeCompare(a.tgl_service));
                             if (logs.length === 0) return <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: 20, border: `1px dashed ${C.border}`, borderRadius: 8 }}>Belum ada riwayat perbaikan</div>;
                             return logs.map((l: any) => (
                                 <div key={l.id} style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>{l.jenis_service}</span>
                                        <span style={{ fontSize: 11, color: C.textLight }}>{l.tgl_service}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: C.textMed }}>Bengkel: {l.bengkel || "—"}</div>
                                    {l.biaya > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginTop: 4 }}>Biaya: {fmt(l.biaya)}</div>}
                                 </div>
                             ));
                         })()}
                      </div>
                   </section>
                </div>
              </div>

              <div style={{ padding: 20, borderTop: `1px solid ${C.border}`, background: C.bg }}>
                 <button className="btn-primary" style={{ width: "100%" }} onClick={() => setGlobalArmadaDetail(null)}>Tutup Detail</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
