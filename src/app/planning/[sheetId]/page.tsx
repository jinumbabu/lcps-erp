"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlanningSheets } from "@/hooks/usePlanningSheets";
import { useBatches } from "@/hooks/useBatches";
import { usePlanningStore } from "@/store/planningStore";
import { useAuthStore } from "@/store/authStore";
import { useBatchStore } from "@/store/batchStore";
import { createBatch, duplicateBatch } from "@/services/batchService";
import { exportBatchesToExcel, parseExcelFile, validateImportData, BatchExportRow } from "@/services/excelService";
import { forwardSchedule, reverseSchedule } from "@/services/scheduleEngine";
import AppShell from "@/components/AppShell";
import PlanningTabs from "@/components/planning/PlanningTabs";
import BatchGrid from "@/components/grid/BatchGrid";
import { motion } from "framer-motion";

interface PlanningPageProps {
  params: { sheetId: string };
}

export default function PlanningPage({ params }: PlanningPageProps) {
  const { sheetId } = params;
  const router = useRouter();

  // Initialize realtime hooks
  usePlanningSheets();
  useBatches(sheetId);

  const { batches, isLoading } = useBatchStore();
  const { lcpsUser, canEdit } = useAuthStore();
  const { setActiveSheet } = usePlanningStore();
  const canEditBool = canEdit();

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"forward" | "reverse">("forward");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    preparationTank: 211,
    rawLatexQty: 6000,
    stabilizerStart: "",
    lineupTime: "",
    plannedMaturation: 30,
  });
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof forwardSchedule> | null>(null);

  // When user changes sheet tab
  const handleSheetChange = (id: string) => {
    setActiveSheet(id);
    router.push(`/planning/${id}`);
  };

  // Live preview calculation
  const updatePreview = (data: typeof formData) => {
    try {
      if (scheduleMode === "forward" && data.stabilizerStart) {
        const s = forwardSchedule({
          stabilizerStart: new Date(data.stabilizerStart),
          rawLatexKg: data.rawLatexQty,
          plannedMaturation: data.plannedMaturation,
        });
        setPreview(s);
      } else if (scheduleMode === "reverse" && data.lineupTime) {
        const s = reverseSchedule({
          desiredLineupTime: new Date(data.lineupTime),
          rawLatexKg: data.rawLatexQty,
          plannedMaturation: data.plannedMaturation,
        });
        setPreview(s);
      }
    } catch {
      setPreview(null);
    }
  };

  const handleFormChange = (field: string, value: string | number) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    updatePreview(updated);
  };

  const handleAddBatch = async () => {
    if (!lcpsUser) return;
    setAdding(true);
    try {
      const stabStart =
        scheduleMode === "forward"
          ? new Date(formData.stabilizerStart)
          : preview?.stabilizerStart ?? new Date();

      await createBatch(
        sheetId,
        {
          preparationTank: formData.preparationTank,
          rawLatexQty: formData.rawLatexQty,
          stabilizerStart: stabStart,
          plannedMaturation: formData.plannedMaturation,
        },
        batches.length,
        lcpsUser.uid,
        lcpsUser.email
      );
      setShowAddBatch(false);
      setPreview(null);
    } catch (err) {
      console.error("Failed to add batch:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleExport = () => {
    exportBatchesToExcel(batches);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!lcpsUser) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await parseExcelFile(file);
      const validation = validateImportData(data);

      if (!validation.valid) {
        alert("Import validation failed:\n" + validation.errors.join("\n"));
        setImporting(false);
        return;
      }

      // Import each row as a new batch
      for (const row of data) {
        const stabilizerStart = row["Stabilizer Start"] ? new Date(row["Stabilizer Start"]) : new Date();
        
        await createBatch(
          sheetId,
          {
            preparationTank: parseInt(row["Preparation Tank"].replace("T", "")),
            rawLatexQty: row["Raw Latex Qty (kg)"],
            stabilizerStart,
            plannedMaturation: row["Planned Maturation (hrs)"],
          },
          batches.length,
          lcpsUser.uid,
          lcpsUser.email
        );
      }

      setShowImportModal(false);
      alert(`Successfully imported ${data.length} batches`);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import Excel file");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const fmt = (d: Date | undefined) =>
    d
      ? d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <AppShell>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Production Planning
          </h1>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 4,
              color: "var(--text-muted)",
            }}
          >
            {batches.length} batch{batches.length !== 1 ? "es" : ""}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={handleExport}
            disabled={batches.length === 0}
            title="Export batches to Excel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>

          {canEditBool && (
            <button
              className="btn-secondary"
              onClick={() => setShowImportModal(true)}
              title="Import batches from Excel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import
            </button>
          )}

          {canEditBool && (
            <button
              id="add-batch-btn"
              className="btn-primary"
              onClick={() => setShowAddBatch(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Batch
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={() => router.push(`/timeline/${sheetId}`)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </svg>
            Timeline
          </button>
        </div>
      </div>

      {/* Planning Tabs */}
      <PlanningTabs onSheetChange={handleSheetChange} />

      {/* Grid */}
      <div style={{ flex: 1 }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-subtle)", borderTopColor: "var(--accent-orange)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading batches…</p>
            </div>
          </div>
        ) : (
          <BatchGrid sheetId={sheetId} />
        )}
      </div>

      {/* Add Batch Modal */}
      {showAddBatch && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddBatch(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content"
            style={{ minWidth: 480 }}
          >
            <div className="modal-header">
              <h2 style={{ fontSize: 16, margin: 0 }}>Add New Batch</h2>
              <button className="btn-icon" onClick={() => setShowAddBatch(false)}>✕</button>
            </div>

            {/* Schedule Mode Toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {(["forward", "reverse"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setScheduleMode(mode); setPreview(null); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: scheduleMode === mode ? "var(--accent-orange)" : "var(--border-subtle)",
                    background: scheduleMode === mode ? "rgba(247,129,102,0.1)" : "transparent",
                    color: scheduleMode === mode ? "var(--accent-orange)" : "var(--text-secondary)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {mode === "forward" ? "⏩ Forward Schedule" : "⏪ Reverse Schedule"}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="form-group">
              <label className="form-label">Preparation Tank</label>
              <input
                id="input-tank"
                type="number"
                className="lcps-input"
                value={formData.preparationTank}
                onChange={(e) => handleFormChange("preparationTank", parseInt(e.target.value))}
                placeholder="211"
              />
              <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                Display: T{String(formData.preparationTank).padStart(3, "0")}
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Raw Latex Quantity (kg)</label>
              <input
                id="input-raw-latex"
                type="number"
                className="lcps-input"
                value={formData.rawLatexQty}
                onChange={(e) => handleFormChange("rawLatexQty", parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Planned Maturation (hours)</label>
              <input
                id="input-maturation"
                type="number"
                className="lcps-input"
                value={formData.plannedMaturation}
                onChange={(e) => handleFormChange("plannedMaturation", parseFloat(e.target.value))}
                min={1}
              />
            </div>

            {scheduleMode === "forward" ? (
              <div className="form-group">
                <label className="form-label">Stabilizer Start</label>
                <input
                  id="input-stab-start"
                  type="datetime-local"
                  className="lcps-input"
                  value={formData.stabilizerStart}
                  onChange={(e) => handleFormChange("stabilizerStart", e.target.value)}
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Desired Line-Up Time</label>
                <input
                  id="input-lineup-time"
                  type="datetime-local"
                  className="lcps-input"
                  value={formData.lineupTime}
                  onChange={(e) => handleFormChange("lineupTime", e.target.value)}
                />
              </div>
            )}

            {/* Live Preview */}
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 20,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
                  Schedule Preview
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                  {[
                    ["Batch Qty", `${preview.batchQty.toLocaleString()} kg`],
                    ["Adjusted Qty", `${preview.adjustedBatchQty.toLocaleString()} kg`],
                    ["Runtime", `${preview.runtime.toFixed(2)} hr`],
                    ["Stab. Start", fmt(preview.stabilizerStart)],
                    ["Disp. End", fmt(preview.dispersionEnd)],
                    ["Dewebber", fmt(preview.dewebberTime)],
                    ["Line-Up", fmt(preview.plannedLineupTime)],
                    ["Finish", fmt(preview.plannedFinishTime)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowAddBatch(false)}>Cancel</button>
              <button
                id="confirm-add-batch"
                className="btn-primary"
                onClick={handleAddBatch}
                disabled={adding || (!formData.stabilizerStart && !formData.lineupTime)}
              >
                {adding ? "Adding…" : "Add Batch"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content"
            style={{ minWidth: 400 }}
          >
            <div className="modal-header">
              <h2 style={{ fontSize: 16, margin: 0 }}>Import Batches</h2>
              <button className="btn-icon" onClick={() => setShowImportModal(false)}>✕</button>
            </div>

            <div style={{ padding: "20px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                Import batches from an Excel file (.xlsx). The file should contain batch data with the following columns:
              </p>
              <ul style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 20, marginBottom: 16, lineHeight: 1.6 }}>
                <li>Batch Number</li>
                <li>Preparation Tank</li>
                <li>Raw Latex Qty (kg)</li>
                <li>Planned Maturation (hrs)</li>
                <li>Stabilizer Start</li>
              </ul>

              <div className="form-group">
                <label className="form-label">Select Excel File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  disabled={importing}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                />
              </div>

              {importing && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-subtle)", borderTopColor: "var(--accent-orange)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Importing batches…</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowImportModal(false)} disabled={importing}>
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
