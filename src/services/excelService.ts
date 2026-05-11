// ============================================================
// LCPS — Excel Service
// Export/Import planning sheets to/from Excel format
// ============================================================

import * as XLSX from "xlsx";
import { Batch } from "@/types";

export interface BatchExportRow {
  "Batch Number": number;
  "Preparation Tank": string;
  "Raw Latex Qty (kg)": number;
  "Batch Qty (kg)": number;
  "Adjusted Qty (kg)": number;
  "Runtime (hrs)": number;
  "Stabilizer Start": string;
  "Stabilizer End": string;
  "Dispersion Start": string;
  "Dispersion End": string;
  "Mix Preparation Start": string;
  "Dewebber Time": string;
  "Planned Line-Up": string;
  "Planned Finish": string;
  "Planned Maturation (hrs)": number;
  "Actual Line-Up": string;
  "Actual Finish": string;
  "Actual Maturation (hrs)": number | null;
  "Over Maturation (hrs)": number | null;
  "Delay (hrs)": number;
  "Delay Status": string;
  "First Batch": boolean;
  "Side Reserve": boolean;
  "Dip Tank": boolean;
  "Side Reserve Refill": boolean;
  "Locked": boolean;
  "Compounded": boolean;
  "Status": string;
}

export function exportBatchesToExcel(batches: Batch[]): void {
  if (batches.length === 0) {
    alert("No batches to export");
    return;
  }

  // Convert batches to export format
  const exportData: BatchExportRow[] = batches.map((b) => ({
    "Batch Number": b.batchNumber,
    "Preparation Tank": b.preparationTankDisplay,
    "Raw Latex Qty (kg)": b.rawLatexQty,
    "Batch Qty (kg)": b.batchQty,
    "Adjusted Qty (kg)": b.adjustedBatchQty,
    "Runtime (hrs)": b.runtime,
    "Stabilizer Start": b.stabilizerStart ? formatDate(b.stabilizerStart.toDate()) : "",
    "Stabilizer End": b.stabilizerEnd ? formatDate(b.stabilizerEnd.toDate()) : "",
    "Dispersion Start": b.dispersionStart ? formatDate(b.dispersionStart.toDate()) : "",
    "Dispersion End": b.dispersionEnd ? formatDate(b.dispersionEnd.toDate()) : "",
    "Mix Preparation Start": b.mixPreparationStart ? formatDate(b.mixPreparationStart.toDate()) : "",
    "Dewebber Time": b.dewebberTime ? formatDate(b.dewebberTime.toDate()) : "",
    "Planned Line-Up": b.plannedLineupTime ? formatDate(b.plannedLineupTime.toDate()) : "",
    "Planned Finish": b.plannedFinishTime ? formatDate(b.plannedFinishTime.toDate()) : "",
    "Planned Maturation (hrs)": b.plannedMaturation,
    "Actual Line-Up": b.actualLineupTime ? formatDate(b.actualLineupTime.toDate()) : "",
    "Actual Finish": b.actualFinishTime ? formatDate(b.actualFinishTime.toDate()) : "",
    "Actual Maturation (hrs)": b.actualMaturation,
    "Over Maturation (hrs)": b.overMaturation,
    "Delay (hrs)": b.delayHour,
    "Delay Status": b.delayStatus,
    "First Batch": b.isFirstBatch,
    "Side Reserve": b.sideReserveEnabled,
    "Dip Tank": b.dipTankEnabled,
    "Side Reserve Refill": b.sideReserveRefill,
    "Locked": b.lockedStatus,
    "Compounded": b.compoundedStatus,
    "Status": b.batchStatus,
  }));

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Batches");

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Batch Number
    { wch: 15 }, // Preparation Tank
    { wch: 18 }, // Raw Latex Qty
    { wch: 15 }, // Batch Qty
    { wch: 16 }, // Adjusted Qty
    { wch: 12 }, // Runtime
    { wch: 20 }, // Stabilizer Start
    { wch: 20 }, // Stabilizer End
    { wch: 20 }, // Dispersion Start
    { wch: 20 }, // Dispersion End
    { wch: 22 }, // Mix Preparation Start
    { wch: 18 }, // Dewebber Time
    { wch: 18 }, // Planned Line-Up
    { wch: 18 }, // Planned Finish
    { wch: 20 }, // Planned Maturation
    { wch: 18 }, // Actual Line-Up
    { wch: 18 }, // Actual Finish
    { wch: 18 }, // Actual Maturation
    { wch: 18 }, // Over Maturation
    { wch: 12 }, // Delay
    { wch: 14 }, // Delay Status
    { wch: 10 }, // First Batch
    { wch: 12 }, // Side Reserve
    { wch: 10 }, // Dip Tank
    { wch: 18 }, // Side Reserve Refill
    { wch: 8 },  // Locked
    { wch: 12 }, // Compounded
    { wch: 12 }, // Status
  ];
  worksheet["!cols"] = colWidths;

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  XLSX.writeFile(workbook, `LCPS_Batches_${timestamp}.xlsx`);
}

function formatDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

export function parseExcelFile(file: File): Promise<BatchExportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<BatchExportRow>(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

export function validateImportData(data: BatchExportRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push("No data found in Excel file");
  }

  data.forEach((row, index) => {
    if (!row["Batch Number"] || isNaN(row["Batch Number"])) {
      errors.push(`Row ${index + 2}: Invalid Batch Number`);
    }
    if (!row["Preparation Tank"]) {
      errors.push(`Row ${index + 2}: Missing Preparation Tank`);
    }
    if (!row["Raw Latex Qty (kg)"] || isNaN(row["Raw Latex Qty (kg)"])) {
      errors.push(`Row ${index + 2}: Invalid Raw Latex Quantity`);
    }
  });

  return { valid: errors.length === 0, errors };
}
