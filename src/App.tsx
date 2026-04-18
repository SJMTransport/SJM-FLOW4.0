import React, { useState, useEffect, useCallback } from "react";
import { 
    APP_NAME, APP_TAGLINE, APP_VERSION, APP_COMPANY, C, ROLE_COLOR, ROLE_BG 
} from "@/src/constants";
import { api, authActions } from "@/src/api";
import { SectionHeader, DBBanner, Icon } from "@/src/components/SJMComponents";
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
    <div style={{ minHeight: "100vh", background: "#F8F9FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FF8F00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 auto 14px" }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1F1F1F", letterSpacing: "-0.02em" }}>SJM Flow</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>{APP_COMPANY} · {APP_VERSION}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1F1F1F", marginBottom: 22 }}>Masuk ke akun</div>
          <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" onKeyDown={e => e.key === "Enter" && submit()} style={{ marginBottom: 16 }} />
          {err && <div style={{ color: "red", fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: "100%" }}>{loading ? "Memverifikasi..." : "Masuk →"}</button>
        </div>
      </div>
    </div>
  );
};

import { HutangPiutangPage } from "@/src/pages/HutangPiutang";
import { KeuanganPage } from "@/src/pages/Keuangan";
import { UpdateMuatan } from "@/src/pages/UpdateMuatan";
import { KontakPage } from "@/src/pages/Kontak";
import { LaporanPage } from "@/src/pages/Laporan";
import { ArmadaPage } from "@/src/pages/Armada";
import { MasterPage } from "@/src/pages/Master";
import { useConfirm } from "@/src/components/SJMComponents";
import { SODetailModal } from "@/src/components/SODetailModal";

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

  if (!session || !currentUser) return <LoginPage onLogin={handleLogin} />;

  const NAV_MODULES = [
    { key: "dashboard", label: "Dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", subs: [] },
    { 
      key: "operasional", label: "Operasional", icon: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", 
      subs: [
        { key: "quotation", label: "Quotation" },
        { key: "so", label: "Sales Order" },
        { key: "invoice", label: "Invoice" },
        { key: "updatemuatan", label: "Update Muatan" }
      ]
    },
    { 
      key: "keuangan", label: "Keuangan", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", 
      subs: [
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
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", background: C.bg }}>
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.sideBorder}`, padding: "0 24px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
           <div style={{ fontSize: 12, color: C.sideTextMuted, display: "flex", gap: 6, alignItems: "center" }}>
              <span>{currentModule?.label}</span>
              {activeSub !== "default" && <span>/ {currentModule?.subs.find(s => s.key === activeSub)?.label}</span>}
           </div>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: ROLE_BG[currentUser.role], color: ROLE_COLOR[currentUser.role], padding: "2px 10px", borderRadius: 5, fontSize: 11, fontWeight: 500 }}>{currentUser.role}</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#22C55E" : "#DC2626", border: "2px solid #fff", boxShadow: "0 0 0 1px #eee" }} />
           </div>
        </div>

        {/* Sub Navigation Tabs */}
        {currentModule && currentModule.subs.length > 0 && (
          <div style={{ background: "#fff", borderBottom: `1px solid ${C.sideBorder}`, padding: "0 24px", display: "flex", gap: 0 }}>
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
        
        <div style={{ padding: 24 }}>
          {activeModule === "dashboard" && <Dashboard jurnal={jurnal} so={so} coa={coa} piutang={piutang} onSOClick={handleSOClick} onNavigate={(path: string) => handleNav("keuangan", path)} />}
          
          {activeModule === "operasional" && (
            <>
              {activeSub === "so" && <SalesOrderPage so={so} setSo={setSo} customer={customer} currentUser={currentUser} onSOClick={handleSOClick} />}
              {activeSub === "updatemuatan" && <UpdateMuatan so={so} setSo={setSo} />}
              {["quotation", "invoice"].includes(activeSub) && (
                <OperasionalPage activeSub={activeSub} so={so} />
              )}
            </>
          )}

          {activeModule === "keuangan" && (
            <>
              {activeSub === "jurnal" && <JurnalUmum jurnal={jurnal} setJurnal={setJurnal} coa={coa} so={so} connected={connected} currentUser={currentUser} onSOClick={handleSOClick} />}
              {activeSub === "hutangpiutang" && <HutangPiutangPage jurnal={jurnal} coa={coa} so={so} connected={connected} onSOClick={handleSOClick} />}
              {["hutangvendor", "cicilan", "rekapuj"].includes(activeSub) && (
                <KeuanganPage activeSub={activeSub} jurnal={jurnal} coa={coa} so={so} connected={connected} />
              )}
            </>
          )}

          {activeModule === "laporan" && <LaporanPage activeSub={activeSub} jurnal={jurnal} coa={coa} so={so} armada={armada} />}
          {activeModule === "armada" && <ArmadaPage activeSub={activeSub} armada={armada} dokumen={armadaDokumen} service={armadaService} sopir={sopir} />}
          
          {activeModule === "master" && (
            <>
              {activeSub === "kontak" && <KontakPage so={so} connected={connected} />}
              {["coa", "saldoawal", "users", "password"].includes(activeSub) && (
                 <MasterPage activeSub={activeSub} activeModule={activeModule} coa={coa} users={users} saldoAwal={saldoAwal} />
              )}
            </>
          )}
        </div>
      </div>

      {/* SO Detail Modal */}
      {globalSODetail && (
        <SODetailModal 
          so={globalSODetail}
          onClose={() => setGlobalSODetail(null)}
        />
      )}
    </div>
  );
}
