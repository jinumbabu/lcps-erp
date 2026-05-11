"use client";

// ============================================================
// LCPS — PlanningTabs Component
// Excel-like sheet tabs with create/rename/duplicate/delete
// ============================================================

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanningStore } from "@/store/planningStore";
import { useAuthStore } from "@/store/authStore";
import {
  createPlanningSheet,
  renamePlanningSheet,
  duplicatePlanningSheet,
  deletePlanningSheet,
} from "@/services/planningSheetService";
import { PlanningSheet } from "@/types";

interface PlanningTabsProps {
  onSheetChange: (sheetId: string) => void;
}

export default function PlanningTabs({ onSheetChange }: PlanningTabsProps) {
  const { sheets, activeSheetId, setActiveSheet } = usePlanningStore();
  const { lcpsUser, canEdit } = useAuthStore();
  const canEditBool = canEdit();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    sheetId: string;
    x: number;
    y: number;
  } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSheet = (sheet: PlanningSheet) => {
    setActiveSheet(sheet.id);
    onSheetChange(sheet.id);
    setContextMenu(null);
  };

  const handleAddSheet = async () => {
    if (!lcpsUser || !canEditBool) return;
    const name = `PLAN-${String.fromCharCode(65 + sheets.length)}`; // PLAN-A, PLAN-B...
    await createPlanningSheet(name, lcpsUser.uid, lcpsUser.email, sheets.length);
  };

  const handleRenameStart = (sheet: PlanningSheet) => {
    setRenamingId(sheet.id);
    setRenameValue(sheet.name);
    setContextMenu(null);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const handleRenameSubmit = async (sheetId: string) => {
    if (!lcpsUser || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const sheet = sheets.find((s) => s.id === sheetId);
    if (!sheet) { setRenamingId(null); return; }
    await renamePlanningSheet(sheetId, renameValue.trim(), lcpsUser.uid, lcpsUser.email, sheet.name);
    setRenamingId(null);
  };

  const handleDuplicate = async (sheetId: string) => {
    if (!lcpsUser) return;
    const sheet = sheets.find((s) => s.id === sheetId);
    if (!sheet) return;
    setContextMenu(null);
    await duplicatePlanningSheet(sheetId, `${sheet.name} Copy`, lcpsUser.uid, lcpsUser.email, sheets.length);
  };

  const handleDelete = async (sheetId: string) => {
    if (!lcpsUser || sheets.length <= 1) return;
    const sheet = sheets.find((s) => s.id === sheetId);
    if (!sheet) return;
    if (!window.confirm(`Delete "${sheet.name}"? This cannot be undone.`)) return;
    setContextMenu(null);
    await deletePlanningSheet(sheetId, lcpsUser.uid, lcpsUser.email, sheet.name);
  };

  const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    if (!canEditBool) return;
    setContextMenu({ sheetId, x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div className="planning-tabs">
        <AnimatePresence mode="popLayout">
          {sheets.map((sheet) => (
            <motion.div
              key={sheet.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {renamingId === sheet.id ? (
                <input
                  ref={renameInputRef}
                  className="tab-item active"
                  style={{
                    border: "1px solid var(--accent-blue)",
                    outline: "none",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    padding: "6px 12px",
                    borderRadius: "6px 6px 0 0",
                    fontSize: 13,
                    fontFamily: "inherit",
                    minWidth: 80,
                    maxWidth: 160,
                  }}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(sheet.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(sheet.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <div
                  id={`tab-${sheet.id}`}
                  className={`tab-item ${activeSheetId === sheet.id ? "active" : ""}`}
                  onClick={() => handleSelectSheet(sheet)}
                  onDoubleClick={() => canEditBool && handleRenameStart(sheet)}
                  onContextMenu={(e) => handleContextMenu(e, sheet.id)}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: activeSheetId === sheet.id
                        ? "var(--accent-orange)"
                        : "var(--border-default)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {sheet.name}
                  {sheet.batchCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        background: "var(--bg-elevated)",
                        padding: "1px 5px",
                        borderRadius: 10,
                      }}
                    >
                      {sheet.batchCount}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {canEditBool && (
          <button
            id="add-sheet-btn"
            className="tab-add-btn"
            onClick={handleAddSheet}
            title="Add planning sheet"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 300 }}
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 400,
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                minWidth: 160,
              }}
            >
              {[
                {
                  label: "Rename",
                  icon: "✏️",
                  action: () => {
                    const sheet = sheets.find((s) => s.id === contextMenu.sheetId);
                    if (sheet) handleRenameStart(sheet);
                  },
                },
                {
                  label: "Duplicate",
                  icon: "📋",
                  action: () => handleDuplicate(contextMenu.sheetId),
                },
                {
                  label: "Delete",
                  icon: "🗑",
                  action: () => handleDelete(contextMenu.sheetId),
                  danger: true,
                  disabled: sheets.length <= 1,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  disabled={item.disabled}
                  onClick={item.action}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    background: "transparent",
                    border: "none",
                    cursor: item.disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: item.danger
                      ? "var(--accent-red)"
                      : item.disabled
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!item.disabled)
                      e.currentTarget.style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
