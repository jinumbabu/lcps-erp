"use client";

import { useMemo } from "react";
import { useBatches } from "@/hooks/useBatches";
import { usePlanningSheets } from "@/hooks/usePlanningSheets";
import { useBatchStore } from "@/store/batchStore";
import { GANTT_COLORS } from "@/lib/constants";
import { Batch } from "@/types";
import { format, differenceInMinutes, addHours } from "date-fns";
import AppShell from "@/components/AppShell";

interface TimelinePageProps {
  params: { sheetId: string };
}

const HOUR_WIDTH = 48; // px per hour
const ROW_HEIGHT = 60;
const LABEL_WIDTH = 140;
const HEADER_HEIGHT = 40;
const VISIBLE_HOURS = 72; // 3 days visible by default

interface GanttSegment {
  label: string;
  start: Date;
  end: Date;
  color: string;
}

function getSegments(batch: Batch): GanttSegment[] {
  if (!batch.stabilizerStart) return [];
  const segments: GanttSegment[] = [];

  const ts = (t: { toDate?: () => Date } | null | undefined): Date | null => {
    if (!t) return null;
    try {
      return (t as { toDate: () => Date }).toDate?.() ?? new Date(t as unknown as string);
    } catch {
      return null;
    }
  };

  const stabStart = ts(batch.stabilizerStart);
  const stabEnd = ts(batch.stabilizerEnd);
  const dispStart = ts(batch.dispersionStart);
  const dispEnd = ts(batch.dispersionEnd);
  const lineupTime = ts(batch.actualLineupTime ?? batch.plannedLineupTime);
  const finishTime = ts(batch.actualFinishTime ?? batch.plannedFinishTime);

  if (stabStart && stabEnd) {
    segments.push({ label: "Stabilizer", start: stabStart, end: stabEnd, color: GANTT_COLORS.STABILIZER });
  }
  if (dispStart && dispEnd) {
    segments.push({ label: "Dispersion", start: dispStart, end: dispEnd, color: GANTT_COLORS.DISPERSION });
  }
  if (dispEnd && lineupTime) {
    const mat = batch.overMaturation && batch.overMaturation > 0
      ? GANTT_COLORS.OVER_MATURED
      : batch.delayStatus === "delayed"
      ? GANTT_COLORS.DELAYED
      : GANTT_COLORS.MATURATION;
    segments.push({ label: "Maturation", start: dispEnd, end: lineupTime, color: mat });
  }
  if (lineupTime && finishTime) {
    const runColor = batch.lockedStatus ? GANTT_COLORS.FINISHED : GANTT_COLORS.RUNNING;
    segments.push({ label: "Running", start: lineupTime, end: finishTime, color: runColor });
  }

  return segments;
}

export default function TimelinePage({ params }: TimelinePageProps) {
  const { sheetId } = params;
  usePlanningSheets();
  useBatches(sheetId);
  const { batches, isLoading } = useBatchStore();

  // Find overall timeline start (earliest stabilizer start)
  const timelineStart = useMemo(() => {
    if (batches.length === 0) {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      return d;
    }
    const times = batches
      .map((b) => {
        try {
          return b.stabilizerStart.toDate();
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Date[];
    if (times.length === 0) return new Date();
    const min = new Date(Math.min(...times.map((t) => t.getTime())));
    min.setHours(min.getHours() - 1, 0, 0, 0);
    return min;
  }, [batches]);

  const totalHours = VISIBLE_HOURS;
  const totalWidth = totalHours * HOUR_WIDTH;

  const xForDate = (d: Date) =>
    ((d.getTime() - timelineStart.getTime()) / 3600000) * HOUR_WIDTH;

  // Hour tick marks
  const hourTicks = useMemo(() => {
    return Array.from({ length: totalHours }, (_, i) => {
      const t = addHours(timelineStart, i);
      return { hour: i, date: t };
    });
  }, [timelineStart, totalHours]);

  const now = new Date();
  const nowX = xForDate(now);

  return (
    <AppShell>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Production Timeline
          </h1>
          <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, color: "var(--text-muted)" }}>
            Gantt View
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Stabilizer", color: GANTT_COLORS.STABILIZER },
            { label: "Dispersion", color: GANTT_COLORS.DISPERSION },
            { label: "Maturation", color: GANTT_COLORS.MATURATION },
            { label: "Running", color: GANTT_COLORS.RUNNING },
            { label: "Delayed", color: GANTT_COLORS.DELAYED },
            { label: "Over-Mat.", color: GANTT_COLORS.OVER_MATURED },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <p style={{ color: "var(--text-muted)" }}>Loading timeline…</p>
          </div>
        ) : batches.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
            <div style={{ fontSize: 40 }}>📅</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No batches to display.</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Add batches in the Planning view to see the timeline.</p>
          </div>
        ) : (
          <div className="gantt-container" style={{ flex: 1, position: "relative" }}>
            <div style={{ display: "flex", minWidth: LABEL_WIDTH + totalWidth }}>
              {/* Sticky row labels column */}
              <div
                style={{
                  width: LABEL_WIDTH,
                  flexShrink: 0,
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  background: "var(--bg-surface)",
                  borderRight: "1px solid var(--border-subtle)",
                }}
              >
                {/* Header spacer */}
                <div style={{ height: HEADER_HEIGHT, borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", padding: "0 12px" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Batch</span>
                </div>
                {/* Batch labels */}
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    style={{
                      height: ROW_HEIGHT,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: "0 12px",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--accent-orange)" }}>
                      #{batch.batchNumber}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {batch.preparationTankDisplay}
                    </div>
                    {batch.delayStatus !== "on_time" && (
                      <span className={`badge badge-${batch.delayStatus === "critical" ? "critical" : "delayed"}`} style={{ marginTop: 2, fontSize: 9 }}>
                        {batch.delayStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Scrollable Gantt area */}
              <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                {/* Hour header */}
                <div
                  style={{
                    height: HEADER_HEIGHT,
                    position: "sticky",
                    top: 0,
                    background: "var(--bg-elevated)",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    zIndex: 5,
                    width: totalWidth,
                  }}
                >
                  {hourTicks.map(({ hour, date }) => (
                    <div
                      key={hour}
                      style={{
                        width: HOUR_WIDTH,
                        flexShrink: 0,
                        borderRight: hour % 6 === 0 ? "1px solid var(--border-default)" : "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 4,
                      }}
                    >
                      {hour % 6 === 0 && (
                        <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 600 }}>
                          {format(date, "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Batch rows */}
                <div style={{ position: "relative", width: totalWidth }}>
                  {/* Now indicator */}
                  {nowX >= 0 && nowX <= totalWidth && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: nowX,
                        width: 2,
                        background: "var(--accent-orange)",
                        zIndex: 8,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "var(--accent-orange)",
                          color: "#fff",
                          fontSize: 9,
                          padding: "2px 4px",
                          borderRadius: 3,
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        NOW
                      </div>
                    </div>
                  )}

                  {/* Vertical hour grid lines */}
                  {hourTicks.map(({ hour }) => (
                    <div
                      key={hour}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: hour * HOUR_WIDTH,
                        width: 1,
                        background: hour % 6 === 0 ? "var(--border-default)" : "var(--border-subtle)",
                        opacity: 0.5,
                        pointerEvents: "none",
                      }}
                    />
                  ))}

                  {batches.map((batch, idx) => {
                    const segments = getSegments(batch);
                    const isFirst = batch.isFirstBatch;

                    return (
                      <div
                        key={batch.id}
                        style={{
                          height: ROW_HEIGHT,
                          position: "relative",
                          borderBottom: "1px solid var(--border-subtle)",
                          background:
                            idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        }}
                      >
                        {/* First batch marker */}
                        {isFirst && (
                          <div
                            style={{
                              position: "absolute",
                              top: 4,
                              left: 0,
                              height: ROW_HEIGHT - 8,
                              width: 3,
                              background: GANTT_COLORS.FIRST_BATCH,
                              borderRadius: 2,
                            }}
                          />
                        )}

                        {segments.map((seg, si) => {
                          const x = xForDate(seg.start);
                          const w = Math.max(
                            4,
                            ((seg.end.getTime() - seg.start.getTime()) / 3600000) * HOUR_WIDTH
                          );
                          if (x + w < 0 || x > totalWidth) return null;

                          return (
                            <div
                              key={si}
                              title={`${seg.label}: ${format(seg.start, "dd/MM HH:mm")} → ${format(seg.end, "dd/MM HH:mm")}`}
                              style={{
                                position: "absolute",
                                left: Math.max(0, x),
                                top: 18,
                                width: w,
                                height: 24,
                                background: seg.color,
                                borderRadius: 3,
                                opacity: 0.85,
                                cursor: "pointer",
                                transition: "opacity 0.15s",
                                display: "flex",
                                alignItems: "center",
                                paddingLeft: 4,
                                overflow: "hidden",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                            >
                              {w > 40 && (
                                <span style={{ fontSize: 9, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                                  {seg.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
