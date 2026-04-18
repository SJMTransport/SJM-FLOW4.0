import React, { useState, useRef } from "react";
import { C } from "@/src/constants";
import { parseCSVFile, parseRupiah } from "@/src/utils/csvParser";
import { fmt } from "@/src/utils";

interface CSVImportModalProps {
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError("");
    setFile(selectedFile);

    // Read and parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const parsed = parseCSVFile(csvText);
        
        if (parsed.length === 0) {
          setError("File CSV tidak valid atau kosong");
          return;
        }

        setPreview(parsed.slice(0, 5)); // Show first 5 rows as preview
      } catch (err: any) {
        setError("Gagal membaca file: " + err.message);
      }
    };
    reader.readAsText(selectedFile, 'utf-8');
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvText = event.target?.result as string;
          const allData = parseCSVFile(csvText);
          
          setProgress({ current: 0, total: allData.length });
          
          // Import in batches of 50
          const batchSize = 50;
          for (let i = 0; i < allData.length; i += batchSize) {
            const batch = allData.slice(i, i + batchSize);
            await onImport(batch);
            setProgress({ current: i + batch.length, total: allData.length });
          }

          onClose();
        } catch (err: any) {
          setError("Gagal import: " + err.message);
          setImporting(false);
        }
      };
      reader.readAsText(file, 'utf-8');
    } catch (err: any) {
      setError("Error: " + err.message);
      setImporting(false);
    }
  };

  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", 
        display: "flex", alignItems: "center", justifyContent: "center", 
        zIndex: 9999, padding: 20 
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          background: "#fff", borderRadius: 12, width: "100%", 
          maxWidth: 800, maxHeight: "90vh", overflow: "auto" 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: "20px 24px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              Import CSV Sales Order
            </h3>
            <p style={{ fontSize: 13, color: C.textLight }}>
              Upload file CSV dengan format SJM (delimiter: semicolon)
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: "none", border: "none", fontSize: 24, 
              color: C.textLight, cursor: "pointer", padding: 0,
              width: 32, height: 32, display: "flex", alignItems: "center", 
              justifyContent: "center" 
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* File Input */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              border: `2px dashed ${C.border}`, borderRadius: 8, 
              padding: 40, textAlign: "center", cursor: "pointer",
              background: C.bg, marginBottom: 20,
              transition: "all 0.2s"
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) {
                setFile(droppedFile);
                handleFileSelect({ target: { files: [droppedFile] } } as any);
              }
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            {file ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: C.textLight }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  Klik untuk pilih file atau drag & drop
                </div>
                <div style={{ fontSize: 12, color: C.textLight }}>
                  Format: .csv dengan delimiter semicolon (;)
                </div>
              </>
            )}
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {/* Preview */}
          {preview.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: C.text }}>
                Preview Data ({preview.length} dari {preview.length} baris)
              </h4>
              <div style={{ 
                border: `1px solid ${C.border}`, borderRadius: 8, 
                overflow: "auto", maxHeight: 300 
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Order ID</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Customer</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Tgl Muat</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Total Harga</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 12px", color: C.accent, fontWeight: 600 }}>
                          {row.order_id}
                        </td>
                        <td style={{ padding: "10px 12px" }}>{row.customer}</td>
                        <td style={{ padding: "10px 12px", color: C.textLight }}>{row.tgl_muat}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                          {fmt(row.total_harga)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ 
                            background: C.accentLight, color: C.accent, 
                            padding: "2px 8px", borderRadius: 4, fontSize: 11 
                          }}>
                            {row.status_muatan}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ 
                fontSize: 11, color: C.textLight, marginTop: 8, 
                padding: "8px 12px", background: "#FFF9E6", borderRadius: 6,
                border: "1px solid #FFE9A0"
              }}>
                ℹ️ Preview menampilkan 5 baris pertama. Semua data akan diimport saat klik "Import".
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ 
              padding: "12px 16px", background: C.redLight, 
              border: `1px solid #FEB2B2`, borderRadius: 8, 
              color: C.red, fontSize: 13, marginBottom: 20 
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Progress */}
          {importing && progress.total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                display: "flex", justifyContent: "space-between", 
                marginBottom: 8, fontSize: 13, color: C.textMed 
              }}>
                <span>Importing...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div style={{ 
                height: 8, background: C.bg, borderRadius: 4, overflow: "hidden" 
              }}>
                <div style={{ 
                  height: "100%", 
                  width: `${(progress.current / progress.total) * 100}%`,
                  background: C.accent, 
                  transition: "width 0.3s" 
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: "16px 24px", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 12, justifyContent: "flex-end"
        }}>
          <button 
            onClick={onClose}
            disabled={importing}
            style={{ 
              padding: "10px 20px", border: `1px solid ${C.border}`,
              borderRadius: 6, background: "#fff", color: C.text,
              fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}
          >
            Batal
          </button>
          <button 
            onClick={handleImport}
            disabled={!file || preview.length === 0 || importing}
            style={{ 
              padding: "10px 20px", border: "none", borderRadius: 6,
              background: (!file || importing) ? C.border : C.accent,
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: (!file || importing) ? "not-allowed" : "pointer"
            }}
          >
            {importing ? "Importing..." : `Import ${preview.length} Sales Order`}
          </button>
        </div>
      </div>
    </div>
  );
};
