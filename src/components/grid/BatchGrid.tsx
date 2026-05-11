"use client";

// ============================================================
// LCPS — BatchGrid Component
// Main AG Grid spreadsheet with all 27 columns
// Real-time Firestore sync + auto-save on cell edit
// ============================================================

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  GridReadyEvent,
  CellValueChangedEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Batch, BatchFormData } from "@/types";
import { useBatchStore } from "@/store/batchStore";
import { useAuthStore } from "@/store/authStore";
import { updateBatch, lockBatch, unlockBatch, deleteBatch, duplicateBatch } from "@/services/batchService";
import { getColumnDefs, rowClassRules } from "./GridColumns";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface BatchGridProps {
  sheetId: string;
}

export default function BatchGrid({ sheetId }: BatchGridProps) {
  const gridRef = useRef<AgGridReact<Batch>>(null);
  const { batches } = useBatchStore();
  const { lcpsUser, canEdit, isAdmin } = useAuthStore();

  const canEditBool = canEdit();
  const isAdminBool = isAdmin();

  const [contextMenu, setContextMenu] = useState<{
    batchId: string;
    batch: Batch;
    x: number;
    y: number;
  } | null>(null);

  const columnDefs = useMemo(
    () => getColumnDefs(canEditBool),
    [canEditBool]
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      suppressMovable: false,
      filter: false,
      minWidth: 80,
      cellClass: "lcps-cell",
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Auto-size columns on load
    params.api.sizeColumnsToFit();
  }, []);

  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<Batch>) => {
      if (!lcpsUser || !event.data) return;
      const batch = event.data;

      // Don't allow edits to locked batches
      if (batch.lockedStatus) {
        // Revert change
        event.api.applyTransaction({ update: [batch] });
        return;
      }

      const field = event.colDef.field as keyof Batch;
      const newValue = event.newValue;

      // Build update object
      const updates: Partial<BatchFormData> = {};

      if (field === "rawLatexQty") {
        updates.rawLatexQty = Number(newValue);
      } else if (field === "plannedMaturation") {
        updates.plannedMaturation = Number(newValue);
      } else if (field === "preparationTank") {
        updates.preparationTank = Number(newValue);
      } else if (field === "runtime") {
        // Manual runtime edit — don't recalculate from qty
        // Just update runtime directly
        updates.rawLatexQty = batch.rawLatexQty; // keep existing
      } else if (field === "stabilizerStart") {
        // Parse entered value as date
        const parsed = new Date(newValue);
        if (!isNaN(parsed.getTime())) {
          updates.stabilizerStart = parsed;
        }
      } else if (field === "actualLineupTime") {
        const parsed = new Date(newValue);
        if (!isNaN(parsed.getTime())) {
          updates.actualLineupTime = parsed;
        }
      } else if (field === "actualFinishTime") {
        const parsed = new Date(newValue);
        if (!isNaN(parsed.getTime())) {
          updates.actualFinishTime = parsed;
        }
      }

      if (Object.keys(updates).length === 0) return;

      try {
        await updateBatch(
          sheetId,
          batch.id,
          updates,
          batch,
          lcpsUser.uid,
          lcpsUser.email
        );
      } catch (err) {
        console.error("[BatchGrid] Save error:", err);
        // Revert on error
        event.api.applyTransaction({ update: [batch] });
      }
    },
    [sheetId, lcpsUser]
  );

  const getRowId = useCallback((params: { data: Batch }) => params.data.id, []);

  // Handle action button clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('.action-btn');
      
      if (actionBtn) {
        const trigger = target.closest('.batch-actions-menu-trigger');
        if (trigger) {
          const batchId = trigger.getAttribute('data-batch-id');
          if (batchId) {
            const batch = batches.find(b => b.id === batchId);
            if (batch) {
              setContextMenu({
                batchId,
                batch,
                x: e.clientX,
                y: e.clientY,
              });
            }
          }
        }
      } else if (!target.closest('.batch-actions-context-menu')) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [batches]);

  const handleLockBatch = async () => {
    if (!contextMenu || !lcpsUser) return;
    try {
      await lockBatch(sheetId, contextMenu.batchId, lcpsUser.uid, lcpsUser.email);
      setContextMenu(null);
    } catch (err) {
      console.error("[BatchGrid] Lock error:", err);
    }
  };

  const handleUnlockBatch = async () => {
    if (!contextMenu || !lcpsUser || !isAdminBool) return;
    try {
      await unlockBatch(sheetId, contextMenu.batchId, lcpsUser.uid, lcpsUser.email);
      setContextMenu(null);
    } catch (err) {
      console.error("[BatchGrid] Unlock error:", err);
    }
  };

  const handleDeleteBatch = async () => {
    if (!contextMenu || !lcpsUser) return;
    if (!window.confirm(`Delete batch #${contextMenu.batch.batchNumber}? This cannot be undone.`)) return;
    try {
      await deleteBatch(sheetId, contextMenu.batchId, contextMenu.batch, lcpsUser.uid, lcpsUser.email);
      setContextMenu(null);
    } catch (err) {
      console.error("[BatchGrid] Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete batch");
    }
  };

  const handleDuplicateBatch = async () => {
    if (!contextMenu || !lcpsUser) return;
    try {
      await duplicateBatch(sheetId, contextMenu.batchId, batches.length, lcpsUser.uid, lcpsUser.email);
      setContextMenu(null);
    } catch (err) {
      console.error("[BatchGrid] Duplicate error:", err);
      alert(err instanceof Error ? err.message : "Failed to duplicate batch");
    }
  };

  return (
    <div
      className="ag-theme-lcps"
      style={{
        height: "calc(100vh - 180px)",
        width: "100%",
      }}
    >
      <AgGridReact<Batch>
        ref={gridRef}
        rowData={batches}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowClassRules={rowClassRules}
        getRowId={getRowId}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        rowHeight={48}
        headerHeight={44}
        suppressRowClickSelection
        enableCellTextSelection
        stopEditingWhenCellsLoseFocus
        undoRedoCellEditing
        undoRedoCellEditingLimit={20}
        animateRows
        pagination={false}
        domLayout="normal"
        suppressContextMenu={false}
        enableRangeSelection
        copyHeadersToClipboard
        suppressCopySingleCellRanges={false}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="batch-actions-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            minWidth: 160,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {contextMenu.batch.lockedStatus ? (
            isAdminBool && (
              <button
                onClick={handleUnlockBatch}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: "var(--text-primary)",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>🔓</span>
                Unlock Batch
              </button>
            )
          ) : (
            <button
              onClick={handleLockBatch}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--text-primary)",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>🔒</span>
              Lock Batch
            </button>
          )}
          <button
            onClick={handleDuplicateBatch}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontFamily: "inherit",
              color: "var(--text-primary)",
              textAlign: "left",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>📋</span>
            Duplicate Batch
          </button>
          {!contextMenu.batch.lockedStatus && (
            <button
              onClick={handleDeleteBatch}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--accent-red)",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,123,114,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>🗑️</span>
              Delete Batch
            </button>
          )}
        </div>
      )}
    </div>
  );
}
