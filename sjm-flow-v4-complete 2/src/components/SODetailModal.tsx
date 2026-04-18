import React from "react";
import { C, STATUS_COLOR, STATUS_BG } from "@/src/constants";
import { fmt } from "@/src/utils";

interface SODetailModalProps {
  so: any;
  onClose: () => void;
}

export const SODetailModal: React.FC<SODetailModalProps> = ({ so, onClose }) => {
  if (!so) return null;

  const Field = ({ label, value, span = 1 }: any) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: value ? 400 : 300 }}>
        {value || "—"}
      </div>
    </div>
  );

  const Section = ({ title, children }: any) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMed, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", 
        display: "flex", justifyContent: "flex-end", zIndex: 9999,
        backdropFilter: "blur(2px)"
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          width: "100%", maxWidth: 600, background: "#fff", 
          height: "100vh", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: "20px 24px", borderBottom: `1px solid ${C.border}`,
          background: C.accentLight, position: "sticky", top: 0, zIndex: 10
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
                {so.order_id}
              </div>
              <div style={{ fontSize: 13, color: C.textMed }}>
                Detail Sales Order
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{ 
                background: "none", border: "none", fontSize: 28, 
                color: C.textLight, cursor: "pointer", padding: 0,
                width: 36, height: 36, display: "flex", alignItems: "center", 
                justifyContent: "center", borderRadius: 6,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              ×
            </button>
          </div>
          
          {/* Status Badge */}
          <div style={{ marginTop: 12 }}>
            <span style={{ 
              display: "inline-block",
              background: STATUS_BG[so.status_muatan] || C.bg, 
              color: STATUS_COLOR[so.status_muatan] || C.text,
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600
            }}>
              {so.status_muatan || "—"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          
          {/* Rute & Customer */}
          <Section title="📍 Rute & Customer">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Lokasi Muat" value={so.lokasi_muat} span={2} />
              <Field label="Lokasi Bongkar" value={so.lokasi_bongkar} span={2} />
              <Field label="Customer" value={so.customer} span={2} />
              <Field label="PIC Customer" value={so.pic} />
              <Field label="No PIC" value={so.no_pic} />
            </div>
          </Section>

          {/* Tanggal */}
          <Section title="📅 Jadwal">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Tgl Order" value={so.tgl_order} />
              <Field label="Tgl Muat" value={so.tgl_muat} />
              <Field label="Jam Muat" value={so.jam_muat} />
              <Field label="Tgl Bongkar" value={so.tgl_bongkar} />
            </div>
          </Section>

          {/* Armada & Muatan */}
          <Section title="🚛 Armada & Muatan">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Jenis Truk" value={so.jenis_truk} />
              <Field label="No Polisi" value={so.no_polisi} />
              <Field label="Nama Sopir" value={so.nama_sopir} />
              <Field label="No Sopir" value={so.no_supir} />
              <Field label="Armada" value={so.armada} />
              <Field label="Unit Muatan" value={so.unit_muatan} />
              <Field label="Muatan" value={so.muatan} span={2} />
              <Field label="SN" value={so.sn} />
              <Field label="SPK" value={so.spk} />
            </div>
          </Section>

          {/* Harga & Keuangan */}
          <Section title="💰 Harga & Keuangan">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Base Harga (Modal)" value={so.base_harga ? fmt(so.base_harga) : "—"} />
              <Field label="Harga Pengiriman" value={so.harga_pengiriman ? fmt(so.harga_pengiriman) : "—"} />
              <Field label="Total Harga" value={so.total_harga ? fmt(so.total_harga) : "—"} />
              <Field label="Pajak PPN (1,1%)" value={so.nilai_pajak ? fmt(so.nilai_pajak) : "—"} />
              <Field label="Total + Pajak" value={so.total_harga_pajak ? fmt(so.total_harga_pajak) : "—"} span={2} />
            </div>
          </Section>

          {/* Asuransi */}
          {(so.harga_asuransi || so.no_asuransi) && (
            <Section title="🛡️ Asuransi">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                <Field label="Harga Asuransi" value={so.harga_asuransi} />
                <Field label="No Asuransi" value={so.no_asuransi} />
                <Field label="Nilai Tanggungan" value={so.nilai_tanggungan_asuransi ? fmt(so.nilai_tanggungan_asuransi) : "—"} />
                <Field label="Nilai Asuransi" value={so.nilai_asuransi ? fmt(so.nilai_asuransi) : "—"} />
              </div>
            </Section>
          )}

          {/* Invoice */}
          {so.no_invoice && (
            <Section title="🧾 Invoice">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                <Field label="No Invoice" value={so.no_invoice} />
                <Field label="Kode Invoice" value={so.kode_invoice} />
              </div>
            </Section>
          )}

          {/* Keterangan */}
          {so.keterangan && (
            <Section title="📝 Keterangan">
              <div style={{ 
                padding: 12, background: C.bg, borderRadius: 8, 
                fontSize: 13, color: C.text, lineHeight: 1.6 
              }}>
                {so.keterangan}
              </div>
            </Section>
          )}

          {/* ShareLok Links */}
          {(so.sharelok_muat || so.sharelok_bongkar) && (
            <Section title="🗺️ ShareLok">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {so.sharelok_muat && (
                  <a 
                    href={so.sharelok_muat} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      padding: "10px 14px", background: C.accentLight, 
                      borderRadius: 6, fontSize: 12, color: C.accent,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    <span>📍</span>
                    <span>Lokasi Muat</span>
                  </a>
                )}
                {so.sharelok_bongkar && (
                  <a 
                    href={so.sharelok_bongkar} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      padding: "10px 14px", background: C.accentLight, 
                      borderRadius: 6, fontSize: 12, color: C.accent,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    <span>📍</span>
                    <span>Lokasi Bongkar</span>
                  </a>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};
