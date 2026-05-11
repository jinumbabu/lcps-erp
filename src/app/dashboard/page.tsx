"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { Batch } from "@/types";
import { usePlanningSheets } from "@/hooks/usePlanningSheets";
import { usePlanningStore } from "@/store/planningStore";
import AppShell from "@/components/AppShell";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface KPI {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: string;
}

export default function DashboardPage() {
  usePlanningSheets();
  const { sheets } = usePlanningStore();
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (sheets.length === 0) return;
      const all: Batch[] = [];
      for (const sheet of sheets) {
        const bRef = collection(db, COLLECTIONS.PLANNING_SHEETS, sheet.id, COLLECTIONS.BATCHES);
        const snap = await getDocs(query(bRef, orderBy("batchNumber")));
        snap.docs.forEach((d) => all.push({ id: d.id, ...d.data() } as Batch));
      }
      setAllBatches(all);
      setLoading(false);
    };
    fetchAll();
  }, [sheets]);

  const now = new Date();

  const running = allBatches.filter((b) => {
    if (!b.plannedLineupTime || !b.plannedFinishTime) return false;
    try {
      const lu = b.plannedLineupTime.toDate();
      const fi = b.plannedFinishTime.toDate();
      return lu <= now && fi >= now && !b.lockedStatus;
    } catch { return false; }
  });

  const delayed = allBatches.filter((b) => b.delayStatus === "delayed" || b.delayStatus === "critical");
  const overMat = allBatches.filter((b) => (b.overMaturation ?? 0) > 0);
  const locked = allBatches.filter((b) => b.lockedStatus);

  const upcomingLineups = allBatches
    .filter((b) => {
      try {
        return b.plannedLineupTime.toDate() > now && !b.lockedStatus;
      } catch { return false; }
    })
    .sort((a, b) => {
      try {
        return a.plannedLineupTime.toDate().getTime() - b.plannedLineupTime.toDate().getTime();
      } catch { return 0; }
    })
    .slice(0, 5);

  const totalLatex = allBatches.reduce((s, b) => s + (b.rawLatexQty ?? 0), 0);

  // Tank occupancy calculation
  const occupiedTanks = new Set(running.map(b => b.preparationTank));
  const totalTanks = 20; // Assuming 20 preparation tanks (T001-T020)
  const occupancyRate = (occupiedTanks.size / totalTanks) * 100;

  // Create tank status array
  const tankStatus = Array.from({ length: totalTanks }, (_, i) => {
    const tankNum = 200 + i + 1;
    const batch = running.find(b => b.preparationTank === tankNum);
    return {
      tank: tankNum,
      occupied: !!batch,
      batch: batch || null,
    };
  });

  const kpis: KPI[] = [
    {
      icon: "🏭",
      label: "Total Batches",
      value: allBatches.length,
      sub: `across ${sheets.length} plan${sheets.length !== 1 ? "s" : ""}`,
      color: "var(--accent-blue)",
    },
    {
      icon: "▶️",
      label: "Running Now",
      value: running.length,
      sub: "active production",
      color: "var(--accent-green)",
    },
    {
      icon: "⚠️",
      label: "Delayed",
      value: delayed.length,
      sub: "require attention",
      color: delayed.length > 0 ? "var(--accent-red)" : "var(--text-muted)",
    },
    {
      icon: "🕐",
      label: "Over-Matured",
      value: overMat.length,
      sub: "quality risk",
      color: overMat.length > 0 ? "#ff4444" : "var(--text-muted)",
    },
    {
      icon: "🔒",
      label: "Compounded",
      value: locked.length,
      sub: "locked & complete",
      color: "var(--text-secondary)",
    },
    {
      icon: "🧪",
      label: "Total Raw Latex",
      value: `${(totalLatex / 1000).toFixed(1)}t`,
      sub: `${totalLatex.toLocaleString()} kg total`,
      color: "var(--accent-amber)",
    },
    {
      icon: "🔧",
      label: "Tank Occupancy",
      value: `${occupancyRate.toFixed(0)}%`,
      sub: `${occupiedTanks.size}/${totalTanks} tanks`,
      color: occupancyRate > 80 ? "var(--accent-red)" : occupancyRate > 60 ? "var(--accent-amber)" : "var(--accent-green)",
    },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          Production Dashboard
        </h1>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {format(now, "EEEE, dd MMMM yyyy • HH:mm")}
        </span>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
            <p style={{ color: "var(--text-muted)" }}>Loading dashboard…</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {kpis.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="kpi-card"
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{kpi.icon}</div>
                  <div className="kpi-value" style={{ color: kpi.color }}>
                    {kpi.value}
                  </div>
                  <div className="kpi-label">{kpi.label}</div>
                  {kpi.sub && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {kpi.sub}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Tank Occupancy Grid */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lcps-card"
              style={{ marginBottom: 24 }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tank Occupancy
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
                {tankStatus.map((tank) => (
                  <div
                    key={tank.tank}
                    style={{
                      aspectRatio: 1,
                      background: tank.occupied ? "var(--accent-green)" : "var(--bg-elevated)",
                      border: tank.occupied ? "2px solid var(--accent-green)" : "2px solid var(--border-subtle)",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: tank.occupied ? "pointer" : "default",
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                    title={tank.batch ? `Batch #${tank.batch.batchNumber} - ${tank.batch.rawLatexQty?.toLocaleString()} kg` : "Available"}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: tank.occupied ? "#fff" : "var(--text-secondary)" }}>
                      {String(tank.tank).padStart(3, "0")}
                    </div>
                    {tank.occupied && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                        #{tank.batch?.batchNumber}
                      </div>
                    )}
                    {tank.occupied && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#fff",
                          animation: "pulse 2s ease-in-out infinite",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: "var(--accent-green)", borderRadius: 4 }} />
                  <span>Occupied ({occupiedTanks.size})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: "var(--bg-elevated)", border: "2px solid var(--border-subtle)", borderRadius: 4 }} />
                  <span>Available ({totalTanks - occupiedTanks.size})</span>
                </div>
              </div>
            </motion.div>

            {/* Upcoming Lineups */}
            {upcomingLineups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="lcps-card"
                style={{ marginBottom: 24 }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Upcoming Line-Ups
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {upcomingLineups.map((b) => {
                    let lineupStr = "—";
                    try {
                      lineupStr = format(b.plannedLineupTime.toDate(), "dd/MM/yyyy HH:mm");
                    } catch {}
                    return (
                      <div
                        key={b.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--accent-orange)", fontSize: 13, minWidth: 40 }}>
                          #{b.batchNumber}
                        </span>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--accent-blue)", minWidth: 56 }}>
                          {b.preparationTankDisplay}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>
                          {b.rawLatexQty?.toLocaleString()} kg
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-green)" }}>
                          {lineupStr}
                        </span>
                        <span className={`badge badge-${b.delayStatus === "on_time" ? "on-time" : b.delayStatus}`}>
                          {b.delayStatus === "on_time" ? "On Time" : b.delayStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Planning Sheets Overview */}
            {sheets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lcps-card"
              >
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Planning Sheets
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sheets.map((sheet) => {
                    const sheetBatches = allBatches.filter((b) => b.planningSheetId === sheet.id);
                    const delayedInSheet = sheetBatches.filter((b) => b.delayStatus !== "on_time").length;
                    return (
                      <div
                        key={sheet.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-orange)", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{sheet.name}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {sheetBatches.length} batches
                        </span>
                        {delayedInSheet > 0 && (
                          <span className="badge badge-delayed">{delayedInSheet} delayed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {allBatches.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏭</div>
                <h2 style={{ fontSize: 18, marginBottom: 8, color: "var(--text-primary)" }}>
                  No Production Data Yet
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  Create a planning sheet and add batches to start scheduling.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
