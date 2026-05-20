import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUsers, FaBed, FaTimesCircle, FaExclamationTriangle, FaCheckCircle,
  FaFileExcel, FaFilePdf, FaFileWord, FaArrowLeft,
} from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const BRAND = { r: 5, g: 49, b: 97 };

const EVENTS = [
  { key: "opened",      label: "Accounts Opened", Icon: FaCheckCircle,         bg: "bg-emerald-500", hex: "#10b981" },
  { key: "dormant",     label: "Became Dormant",  Icon: FaBed,                 bg: "bg-amber-400",   hex: "#f59e0b" },
  { key: "closed",      label: "Became Closed",   Icon: FaTimesCircle,         bg: "bg-rose-500",    hex: "#f43f5e" },
  { key: "reactivated", label: "Reactivated",     Icon: MdTrendingUp,          bg: "bg-blue-500",    hex: "#3b82f6" },
  { key: "escheat",     label: "Escheated",       Icon: FaExclamationTriangle, bg: "bg-purple-500",  hex: "#8b5cf6" },
];

const STATUS_META = {
  active:      { label: "Active",      hex: "#10b981", light: "#d1fae5" },
  dormant:     { label: "Dormant",     hex: "#f59e0b", light: "#fef3c7" },
  closed:      { label: "Closed",      hex: "#f43f5e", light: "#ffe4e6" },
  escheat:     { label: "Escheated",   hex: "#8b5cf6", light: "#ede9fe" },
  reactivated: { label: "Reactivated", hex: "#3b82f6", light: "#dbeafe" },
};

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// ── Excel Export ──────────────────────────────────────────────────────────────

const STATUS_SHEET_ORDER = ['active', 'dormant', 'closed', 'reactivated', 'escheat'];

// Hex colors for each status (no "#" prefix — xlsx-js-style format)
const STATUS_HEX = {
  active:      { header: "10b981", tint: "d1fae5", dark: "065f46" },
  dormant:     { header: "f59e0b", tint: "fef3c7", dark: "92400e" },
  closed:      { header: "f43f5e", tint: "ffe4e6", dark: "9f1239" },
  reactivated: { header: "3b82f6", tint: "dbeafe", dark: "1e40af" },
  escheat:     { header: "8b5cf6", tint: "ede9fe", dark: "5b21b6" },
};

const ACTIVITY_LABELS = {
  opened:      "New Accounts Opened",
  dormant:     "Accounts That Went Dormant",
  closed:      "Accounts That Were Closed",
  reactivated: "Accounts That Were Reactivated",
  escheat:     "Accounts Forwarded to Escheat",
};

const exportExcel = async (report) => {
  // xlsx-js-style is a drop-in for xlsx with full cell-styling support
  const mod = await import("xlsx-js-style");
  const XLSX = mod.default ?? mod;
  const { utils, writeFile } = XLSX;
  const { meta, summary, customers_by_event } = report;
  const wb = utils.book_new();
  const sd = (s) => String(s ?? "").replace(/,?\s+/g, "_");

  // ── Brand palette (hex without #) ──────────────────────────────────────────
  const N_DARK   = "053161"; // RBT navy dark
  const N_MID    = "0d4a8a"; // RBT navy mid
  const N_LIGHT  = "1c6db5"; // RBT navy light
  const WHITE    = "FFFFFF";
  const DARK_TXT = "1e293b";
  const MID_TXT  = "64748b";
  const ROW_ALT  = "eef3fb"; // very light blue-gray alternating row
  const BORDER   = "cbd5e1";

  // ── Style helpers ──────────────────────────────────────────────────────────
  const font  = (sz, bold, color, italic) => ({ name: "Calibri", sz, bold: !!bold, color: { rgb: color }, ...(italic ? { italic: true } : {}) });
  const fill  = (rgb) => ({ patternType: "solid", fgColor: { rgb } });
  const align = (h, v = "center") => ({ horizontal: h, vertical: v });
  const _bord = (style, rgb) => ({ top: { style, color: { rgb } }, bottom: { style, color: { rgb } }, left: { style, color: { rgb } }, right: { style, color: { rgb } } });
  const bordB = (style, rgb) => ({ bottom: { style, color: { rgb } } });

  const ST = {
    bankTitle:    { fill: fill(N_DARK),  font: font(16, true,  WHITE),    alignment: align("center") },
    reportTitle:  { fill: fill(N_DARK),  font: font(11, false, WHITE),    alignment: align("center") },
    colorBar:     { fill: fill(N_LIGHT), font: font(8,  false, WHITE) },
    metaLabel:    { font: font(10, true,  N_DARK),   alignment: align("left", "center") },
    metaVal:      { font: font(10, false, DARK_TXT), alignment: align("left", "center") },
    secHdr:       { fill: fill(N_DARK),  font: font(10, true, WHITE),     alignment: align("left", "center") },
    colHdrL:      { fill: fill(N_MID),   font: font(9,  true, WHITE),     alignment: align("left",   "center"), border: bordB("medium", N_LIGHT) },
    colHdrR:      { fill: fill(N_MID),   font: font(9,  true, WHITE),     alignment: align("right",  "center"), border: bordB("medium", N_LIGHT) },
    rowL:   (alt) => ({ ...(alt ? { fill: fill(ROW_ALT) } : {}), font: font(10, false, DARK_TXT), alignment: align("left",  "center"), border: bordB("hair", BORDER) }),
    rowR:   (alt) => ({ ...(alt ? { fill: fill(ROW_ALT) } : {}), font: font(10, false, N_DARK),   alignment: align("right", "center"), border: bordB("hair", BORDER) }),
    totalL:       { fill: fill(N_DARK),  font: font(10, true, WHITE),     alignment: align("left",  "center") },
    totalR:       { fill: fill(N_DARK),  font: font(10, true, WHITE),     alignment: align("right", "center") },
    footerTxt:    { fill: fill(N_DARK),  font: font(8,  false, WHITE, true), alignment: align("left", "center") },
  };

  // ── Low-level cell writer ──────────────────────────────────────────────────
  const wc = (ws, row, col, value, style) => {
    const addr = utils.encode_cell({ r: row, c: col });
    ws[addr] = { v: value ?? "", t: typeof value === "number" ? "n" : "s", s: style };
  };
  const fillRow = (ws, row, c1, c2, style) => {
    for (let c = c1; c <= c2; c++) wc(ws, row, c, "", style);
  };
  const mrg = (list, r1, c1, r2, c2) => list.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY SHEET
  // ══════════════════════════════════════════════════════════════════════════
  const ws1 = {};
  const m1  = [];
  const rh1 = [];
  let r = 0;
  const C = 3; // last col index (4 cols: 0–3)

  // ── Title block ───────────────────────────────────────────────────────────
  fillRow(ws1, r, 0, C, ST.bankTitle);
  wc(ws1, r, 0, "RBT BANK INC.", ST.bankTitle);
  mrg(m1, r, 0, r, C);
  rh1[r] = { hpt: 34 }; r++;

  fillRow(ws1, r, 0, C, ST.reportTitle);
  wc(ws1, r, 0, "Customer Account Activity Report", ST.reportTitle);
  mrg(m1, r, 0, r, C);
  rh1[r] = { hpt: 22 }; r++;

  fillRow(ws1, r, 0, C, ST.colorBar);
  rh1[r] = { hpt: 5 }; r++;

  // ── Report info ───────────────────────────────────────────────────────────
  rh1[r] = { hpt: 8 }; r++; // spacer

  [
    ["Report Period",  `${meta.date_from}  to  ${meta.date_to}`],
    ["Branch",         meta.branch_label],
    ["Date Prepared",  meta.generated_at],
  ].forEach(([lbl, val]) => {
    wc(ws1, r, 1, lbl, ST.metaLabel);
    wc(ws1, r, 2, val, ST.metaVal);
    rh1[r] = { hpt: 18 }; r++;
  });

  rh1[r] = { hpt: 14 }; r++; // spacer

  // ── Section: Account Activity ─────────────────────────────────────────────
  fillRow(ws1, r, 0, C, ST.secHdr);
  wc(ws1, r, 0, "  ACCOUNT ACTIVITY DURING THIS PERIOD", ST.secHdr);
  mrg(m1, r, 0, r, C);
  rh1[r] = { hpt: 24 }; r++;

  // Column headers
  wc(ws1, r, 0, "", ST.colHdrL);
  wc(ws1, r, 1, "Type of Activity", ST.colHdrL);
  wc(ws1, r, 2, "Number of Accounts", ST.colHdrR);
  wc(ws1, r, 3, "", ST.colHdrR);
  rh1[r] = { hpt: 20 }; r++;

  // Event data rows
  EVENTS.forEach(({ key }, i) => {
    const count = summary[key] ?? 0;
    const alt = i % 2 === 1;
    wc(ws1, r, 0, "", ST.rowL(alt));
    wc(ws1, r, 1, ACTIVITY_LABELS[key], ST.rowL(alt));
    wc(ws1, r, 2, count, ST.rowR(alt));
    wc(ws1, r, 3, "", ST.rowL(alt));
    rh1[r] = { hpt: 18 }; r++;
  });

  // Total row
  fillRow(ws1, r, 0, C, ST.totalL);
  wc(ws1, r, 1, "Total Account Changes in This Period", ST.totalL);
  wc(ws1, r, 2, summary.total_events ?? 0, ST.totalR);
  rh1[r] = { hpt: 22 }; r++;

  rh1[r] = { hpt: 16 }; r++; // spacer

  // ── Section: By Account Type ──────────────────────────────────────────────
  const acctEntries = Object.entries(summary.by_account_type ?? {});
  if (acctEntries.length > 0) {
    fillRow(ws1, r, 0, C, ST.secHdr);
    wc(ws1, r, 0, "  BREAKDOWN BY ACCOUNT TYPE", ST.secHdr);
    mrg(m1, r, 0, r, C);
    rh1[r] = { hpt: 24 }; r++;

    wc(ws1, r, 0, "", ST.colHdrL);
    wc(ws1, r, 1, "Account Type", ST.colHdrL);
    wc(ws1, r, 2, "Number of Accounts", ST.colHdrR);
    wc(ws1, r, 3, "", ST.colHdrR);
    rh1[r] = { hpt: 20 }; r++;

    acctEntries.forEach(([k, v], i) => {
      const alt = i % 2 === 1;
      wc(ws1, r, 0, "", ST.rowL(alt));
      wc(ws1, r, 1, k, ST.rowL(alt));
      wc(ws1, r, 2, v, ST.rowR(alt));
      wc(ws1, r, 3, "", ST.rowL(alt));
      rh1[r] = { hpt: 18 }; r++;
    });

    rh1[r] = { hpt: 16 }; r++;
  }

  // ── Section: By Risk Rating ───────────────────────────────────────────────
  const riskEntries = Object.entries(summary.by_risk_level ?? {});
  if (riskEntries.length > 0) {
    fillRow(ws1, r, 0, C, ST.secHdr);
    wc(ws1, r, 0, "  BREAKDOWN BY RISK RATING", ST.secHdr);
    mrg(m1, r, 0, r, C);
    rh1[r] = { hpt: 24 }; r++;

    wc(ws1, r, 0, "", ST.colHdrL);
    wc(ws1, r, 1, "Risk Rating", ST.colHdrL);
    wc(ws1, r, 2, "Number of Accounts", ST.colHdrR);
    wc(ws1, r, 3, "", ST.colHdrR);
    rh1[r] = { hpt: 20 }; r++;

    riskEntries.forEach(([k, v], i) => {
      const alt = i % 2 === 1;
      wc(ws1, r, 0, "", ST.rowL(alt));
      wc(ws1, r, 1, k, ST.rowL(alt));
      wc(ws1, r, 2, v, ST.rowR(alt));
      wc(ws1, r, 3, "", ST.rowL(alt));
      rh1[r] = { hpt: 18 }; r++;
    });

    rh1[r] = { hpt: 16 }; r++;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  fillRow(ws1, r, 0, C, ST.footerTxt);
  wc(ws1, r, 0, `  This report is for internal bank use only.   RBT Bank Inc.  |  Prepared: ${meta.generated_at}`, ST.footerTxt);
  mrg(m1, r, 0, r, C);
  rh1[r] = { hpt: 18 };

  ws1["!ref"]    = utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: C } });
  ws1["!merges"] = m1;
  ws1["!cols"]   = [{ wch: 3 }, { wch: 42 }, { wch: 24 }, { wch: 3 }];
  ws1["!rows"]   = rh1;
  utils.book_append_sheet(wb, ws1, "Summary");

  // ══════════════════════════════════════════════════════════════════════════
  // STATUS SHEETS  (one per status: Active, Dormant, Closed, Reactivated, Escheat)
  // ══════════════════════════════════════════════════════════════════════════

  // Collect customers from all events, de-dup by account_no, group by status
  const statusGroups = {};
  const seen = new Set();
  for (const { key } of EVENTS) {
    for (const row of customers_by_event[key] ?? []) {
      const uid = row.account_no || `${row.full_name}__${row.date_opened}`;
      if (seen.has(uid)) { continue; }
      seen.add(uid);
      const s = row.status ?? "unknown";
      if (!statusGroups[s]) { statusGroups[s] = []; }
      statusGroups[s].push(row);
    }
  }

  // List sheet column definitions
  const LIST_COLS = [
    { wch: 5  }, // #
    { wch: 18 }, // Account No.
    { wch: 28 }, // Full Name
    { wch: 20 }, // Account Type
    { wch: 14 }, // Status
    { wch: 14 }, // Date Opened
    { wch: 22 }, // Branch
    { wch: 12 }, // Branch Code
    { wch: 14 }, // Risk Rating
    { wch: 24 }, // Recorded By
  ];
  const LC = LIST_COLS.length - 1; // last col index = 9

  const LIST_HEADERS = [
    { label: "#",            align: "center" },
    { label: "Account No.",  align: "left"   },
    { label: "Full Name",    align: "left"   },
    { label: "Account Type", align: "left"   },
    { label: "Status",       align: "center" },
    { label: "Date Opened",  align: "center" },
    { label: "Branch",       align: "left"   },
    { label: "Branch Code",  align: "center" },
    { label: "Risk Rating",  align: "center" },
    { label: "Recorded By",  align: "left"   },
  ];

  for (const status of STATUS_SHEET_ORDER) {
    const rows = statusGroups[status] ?? [];
    if (rows.length === 0) { continue; }

    const sheetLabel = STATUS_META[status]?.label ?? status;
    const sc = STATUS_HEX[status] ?? { header: "64748b", tint: "f1f5f9", dark: "334155" };

    const ws2 = {};
    const m2  = [];
    const rh2 = [];
    let r2 = 0;

    // ── Status sheet title ──────────────────────────────────────────────────
    const sBankTitle = { fill: fill(N_DARK), font: font(13, true, WHITE), alignment: align("left", "center") };
    fillRow(ws2, r2, 0, LC, sBankTitle);
    wc(ws2, r2, 0, "  RBT BANK INC. — Customer Account Activity Report", sBankTitle);
    mrg(m2, r2, 0, r2, LC);
    rh2[r2] = { hpt: 26 }; r2++;

    const sStatusBanner = { fill: fill(sc.header), font: font(13, true, WHITE), alignment: align("left", "center") };
    fillRow(ws2, r2, 0, LC, sStatusBanner);
    wc(ws2, r2, 0, `  ${sheetLabel} Accounts  —  ${rows.length} Record(s)`, sStatusBanner);
    mrg(m2, r2, 0, r2, LC);
    rh2[r2] = { hpt: 26 }; r2++;

    const sPeriod = { fill: fill(sc.tint), font: font(9, false, sc.dark), alignment: align("left", "center") };
    fillRow(ws2, r2, 0, LC, sPeriod);
    wc(ws2, r2, 0, `  Report Period: ${meta.date_from}  to  ${meta.date_to}   |   Branch: ${meta.branch_label}   |   Date Prepared: ${meta.generated_at}`, sPeriod);
    mrg(m2, r2, 0, r2, LC);
    rh2[r2] = { hpt: 16 }; r2++;

    rh2[r2] = { hpt: 6 }; r2++; // spacer

    // ── Column headers ──────────────────────────────────────────────────────
    LIST_HEADERS.forEach((h, ci) => {
      wc(ws2, r2, ci, h.label, {
        fill: fill(N_DARK),
        font: font(9, true, WHITE),
        alignment: align(h.align, "center"),
        border: bordB("medium", N_LIGHT),
      });
    });
    rh2[r2] = { hpt: 20 }; r2++;

    // ── Data rows ───────────────────────────────────────────────────────────
    const ROW_ALIGNS = ["center","left","left","left","center","center","left","center","center","left"];

    rows.forEach((c, i) => {
      const alt = i % 2 === 1;
      const vals = [
        i + 1,
        c.account_no ?? "—",
        c.full_name  ?? "—",
        c.account_type ?? "—",
        STATUS_META[c.status]?.label ?? c.status,
        c.date_opened  ?? "—",
        c.branch       ?? "—",
        c.branch_brak  ?? "—",
        c.risk_level   ?? "—",
        c.uploaded_by  ?? "—",
      ];
      vals.forEach((v, ci) => {
        wc(ws2, r2, ci, v, {
          ...(alt ? { fill: fill(ROW_ALT) } : {}),
          font: font(10, false, DARK_TXT),
          alignment: align(ROW_ALIGNS[ci], "center"),
          border: bordB("hair", BORDER),
        });
      });
      rh2[r2] = { hpt: 17 }; r2++;
    });

    // ── Footer ──────────────────────────────────────────────────────────────
    fillRow(ws2, r2, 0, LC, ST.footerTxt);
    wc(ws2, r2, 0, `  Total: ${rows.length} ${sheetLabel} account(s)   |   This report is for internal bank use only.  —  RBT Bank Inc.`, ST.footerTxt);
    mrg(m2, r2, 0, r2, LC);
    rh2[r2] = { hpt: 18 };

    ws2["!ref"]    = utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r2, c: LC } });
    ws2["!merges"] = m2;
    ws2["!cols"]   = LIST_COLS;
    ws2["!rows"]   = rh2;
    utils.book_append_sheet(wb, ws2, sheetLabel.slice(0, 31));
  }

  writeFile(wb, `Account_Activity_Report_${sd(meta.date_from)}_to_${sd(meta.date_to)}.xlsx`);
};

// ── PDF Export ────────────────────────────────────────────────────────────────

const exportPDF = async (report) => {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { meta, summary, customers_by_event } = report;

  const NAVY  = [BRAND.r, BRAND.g, BRAND.b];
  const LIGHT = [245, 248, 252];
  const WHITE = [255, 255, 255];
  const sd    = (s) => String(s ?? "").replace(/,?\s+/g, "_");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pW  = doc.internal.pageSize.getWidth();
  const pH  = doc.internal.pageSize.getHeight();

  // ── Cover page ─────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pW, 55, "F");

  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont(undefined, "bold");
  doc.text("RBT BANK INC.", pW / 2, 20, { align: "center" });

  doc.setFontSize(18);
  doc.text("Customer Account Activity Report", pW / 2, 32, { align: "center" });

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text("Status Event Report by Inclusive Date", pW / 2, 41, { align: "center" });

  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.3);
  doc.line(20, 46, pW - 20, 46);
  doc.setFontSize(8);
  doc.text(`Period: ${meta.date_from}  –  ${meta.date_to}     |     ${meta.branch_label}`, pW / 2, 52, { align: "center" });

  // Meta box
  let y = 68;
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(220, 228, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, pW - 28, 32, 3, 3, "FD");
  doc.setFontSize(8);
  [
    ["Report Period", `${meta.date_from}  to  ${meta.date_to}`],
    ["Branch Scope",  meta.branch_label],
    ["Generated On",  meta.generated_at],
    ["Total Events",  String(meta.total_events)],
  ].forEach(([label, value], i) => {
    const col  = i < 2 ? 20 : pW / 2 + 6;
    const rowY = y + 9 + (i % 2) * 10;
    doc.setFont(undefined, "bold");
    doc.setTextColor(...NAVY);
    doc.text(label + ":", col, rowY);
    doc.setFont(undefined, "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(value, col + 30, rowY);
  });

  // Event summary cards
  y = 112;
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("STATUS EVENT SUMMARY", 14, y);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 14 + 80, y + 2);

  y += 8;
  const cardW = (pW - 28 - 8) / 3;
  const cardH = 22;
  const eventItems = [
    { label: "Total Events", value: summary.total_events, hex: "#053161" },
    ...EVENTS.map(({ key, label, hex }) => ({ label, value: summary[key] ?? 0, hex })),
  ];

  eventItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx  = 14 + col * (cardW + 4);
    const cy  = y + row * (cardH + 4);
    const rgb = hexToRgb(item.hex);

    doc.setFillColor(...LIGHT);
    doc.setDrawColor(220, 228, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, "FD");
    doc.setFillColor(...rgb);
    doc.roundedRect(cx, cy, 3, cardH, 1, 1, "F");

    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...rgb);
    doc.text(fmt(item.value), cx + cardW - 5, cy + 13, { align: "right" });

    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(item.label.toUpperCase(), cx + 6, cy + 8);

    if (item.label !== "Total Events") {
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`${pct(item.value, summary.total_events)}% of total`, cx + 6, cy + 18);
    }
  });

  y += Math.ceil(eventItems.length / 3) * (cardH + 4) + 8;

  // Breakdown tables
  const hasAccountType = Object.keys(summary.by_account_type ?? {}).length > 0;
  const hasRiskLevel   = Object.keys(summary.by_risk_level ?? {}).length > 0;
  if (hasAccountType || hasRiskLevel) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("BREAKDOWN", 14, y);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(14, y + 2, 50, y + 2);
    y += 6;
    const halfW = (pW - 28 - 6) / 2;

    if (hasAccountType) {
      autoTable(doc, {
        startY: y, tableWidth: halfW,
        margin: { left: 14, right: pW / 2 + 3 },
        head: [["By Account Type", "Count", "%"]],
        body: Object.entries(summary.by_account_type).map(([k, v]) => [k, fmt(v), `${pct(v, summary.total_events)}%`]),
        headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      });
    }

    if (hasRiskLevel) {
      autoTable(doc, {
        startY: y, tableWidth: halfW,
        margin: { left: pW / 2 + 3, right: 14 },
        head: [["By Risk Level", "Count", "%"]],
        body: Object.entries(summary.by_risk_level).map(([k, v]) => [k, fmt(v), `${pct(v, summary.total_events)}%`]),
        headStyles: { fillColor: [16, 100, 80], textColor: WHITE, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      });
    }
  }

  // Bottom bar for cover page
  doc.setFillColor(...NAVY);
  doc.rect(0, pH - 10, pW, 10, "F");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.setFont(undefined, "normal");
  doc.text("RBT Bank Inc. — CONFIDENTIAL", 14, pH - 4);
  doc.text(`Generated: ${meta.generated_at}`, pW / 2, pH - 4, { align: "center" });
  doc.text("Page 1", pW - 14, pH - 4, { align: "right" });

  // ── One landscape page per event type ─────────────────────────────────────
  let pageNum = 1;
  for (const { key, label, hex } of EVENTS) {
    const rows = customers_by_event[key] ?? [];
    if (rows.length === 0) { continue; }
    pageNum++;

    doc.addPage("a4", "landscape");
    const pWL = doc.internal.pageSize.getWidth();
    const pHL = doc.internal.pageSize.getHeight();
    const rgb = hexToRgb(hex);

    doc.setFillColor(...rgb);
    doc.rect(0, 0, pWL, 10, "F");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.setFont(undefined, "bold");
    doc.text(`${label}  (${rows.length} records)`, 14, 7);
    doc.setFont(undefined, "normal");
    doc.text(`Period: ${meta.date_from} – ${meta.date_to}  |  ${meta.branch_label}`, pWL - 14, 7, { align: "right" });

    autoTable(doc, {
      startY: 14,
      margin: { left: 10, right: 10, bottom: 14 },
      head: [["#", "Account No.", "Full Name", "Account Type", "Current Status", "Date Opened", "Event Date", "Branch", "Code", "Risk Level", "Uploaded By"]],
      body: rows.map((c, i) => [
        i + 1,
        c.account_no ?? "—",
        c.full_name,
        c.account_type,
        STATUS_META[c.status]?.label ?? c.status,
        c.date_opened ?? "—",
        c.event_date ?? "—",
        c.branch,
        c.branch_brak,
        c.risk_level,
        c.uploaded_by ?? "—",
      ]),
      headStyles: { fillColor: rgb, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [248, 250, 254] },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 24 },
        4: { halign: "center", cellWidth: 22 },
        5: { halign: "center", cellWidth: 22 },
        6: { halign: "center", cellWidth: 22 },
        8: { halign: "center", cellWidth: 16 },
        9: { halign: "center", cellWidth: 20 },
      },
    });

    doc.setFillColor(...NAVY);
    doc.rect(0, pHL - 10, pWL, 10, "F");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.setFont(undefined, "normal");
    doc.text("RBT Bank Inc. — CONFIDENTIAL", 14, pHL - 4);
    doc.text(`Generated: ${meta.generated_at}`, pWL / 2, pHL - 4, { align: "center" });
    doc.text(`Page ${pageNum}`, pWL - 14, pHL - 4, { align: "right" });
  }

  doc.save(`Account_Activity_Report_${sd(meta.date_from)}_to_${sd(meta.date_to)}.pdf`);
};

// ── Word Export ───────────────────────────────────────────────────────────────

const exportWord = (report) => {
  const { meta, summary, customers_by_event } = report;
  const sd = (s) => String(s ?? "").replace(/,?\s+/g, "_");

  const th = (cell) =>
    `<th style="background:#053161;color:#fff;padding:8px 12px;text-align:left;font-size:10pt;letter-spacing:0.03em">${cell}</th>`;
  const td = (cell, center = false, bold = false) =>
    `<td style="padding:7px 12px;font-size:10pt;color:#1e293b;text-align:${center ? "center" : "left"};${bold ? "font-weight:600;" : ""}">${cell ?? "—"}</td>`;

  const statusBadge = (statusKey) => {
    const s = STATUS_META[statusKey] ?? { hex: "#64748b", label: statusKey };
    return `<span style="background:${s.hex}22;color:${s.hex};border:1px solid ${s.hex}66;padding:2px 8px;border-radius:999px;font-size:9pt;font-weight:600">${s.label}</span>`;
  };

  const eventSections = EVENTS.map(({ key, label, hex }) => {
    const rows = customers_by_event[key] ?? [];
    if (rows.length === 0) { return ""; }
    return `
<div class="page-break"></div>
<h2 style="color:${hex};border-color:${hex}">${label}&nbsp;&nbsp;<span style="font-size:10pt;color:#64748b;font-weight:400">(${rows.length} records)</span></h2>
<p class="section-note">Period: ${meta.date_from} – ${meta.date_to}&nbsp;|&nbsp;${meta.branch_label}</p>
<table>
  <thead>
    <tr>${["#", "Account No.", "Full Name", "Account Type", "Current Status", "Date Opened", "Event Date", "Branch", "Risk Level", "Uploaded By"].map(th).join("")}</tr>
  </thead>
  <tbody>
    ${rows.map((c, i) => `
    <tr style="${i % 2 === 1 ? "background:#f8fafc" : ""}">
      ${td(String(i + 1), true)}
      ${td(`<span style="font-family:monospace;font-size:9.5pt">${c.account_no ?? "—"}</span>`)}
      ${td(`<strong>${c.full_name}</strong>`)}
      ${td(c.account_type, true)}
      <td style="padding:6px 12px;text-align:center">${statusBadge(c.status)}</td>
      ${td(c.date_opened ?? "—", true)}
      ${td(`<strong style="color:${hex}">${c.event_date ?? "—"}</strong>`, true)}
      ${td(`${c.branch} <span style="color:#94a3b8;font-size:9pt">(${c.branch_brak})</span>`)}
      ${td(c.risk_level ?? "—", true)}
      ${td(c.uploaded_by ?? "—")}
    </tr>`).join("")}
  </tbody>
</table>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 2.5cm 2cm; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; margin: 0; }
  h2   { font-size: 13pt; color: #053161; border-bottom: 2.5px solid #053161; padding-bottom: 4px; margin: 24px 0 10px 0; letter-spacing: 0.04em; }
  table { border-collapse: collapse; width: 100%; margin-top: 6px; }
  tr:nth-child(even) td { background: #f8fafc; }
  td, th { border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  .cover-band { background: #053161; color: #fff; padding: 26px 30px 22px; margin: -2.5cm -2cm 24px; }
  .cover-title { font-size: 24pt; font-weight: 700; color: #fff; margin: 0 0 4px; }
  .cover-sub   { font-size: 11pt; color: #93c5fd; margin: 0; }
  .meta-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin: 16px 0; }
  .meta-item   { display: flex; gap: 8px; font-size: 10pt; }
  .meta-label  { color: #64748b; font-weight: 600; min-width: 110px; }
  .meta-value  { color: #1e293b; font-weight: 700; }
  .total-row td { background: #053161 !important; color: #fff !important; font-weight: 700; border: none; }
  .section-note { font-size: 9pt; color: #94a3b8; margin: -6px 0 8px; }
  .page-break { page-break-before: always; }
  .footer-bar { background: #053161; color: #fff; font-size: 8pt; padding: 8px 18px; margin: 30px -2cm -2.5cm; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<div class="cover-band">
  <p class="cover-title">Customer Account Activity Report</p>
  <p class="cover-sub">RBT Bank Inc. &nbsp;|&nbsp; Account Monitoring &amp; Compliance</p>
</div>

<div class="meta-grid">
  <div class="meta-item"><span class="meta-label">Report Period:</span><span class="meta-value">${meta.date_from} &nbsp;–&nbsp; ${meta.date_to}</span></div>
  <div class="meta-item"><span class="meta-label">Branch Scope:</span><span class="meta-value">${meta.branch_label}</span></div>
  <div class="meta-item"><span class="meta-label">Generated On:</span><span class="meta-value">${meta.generated_at}</span></div>
  <div class="meta-item"><span class="meta-label">Total Events:</span><span class="meta-value">${meta.total_events}</span></div>
</div>

<h2>Status Event Summary</h2>
<p class="section-note">Account activity events within the selected period and branch scope.</p>
<table>
  <thead><tr>${["Event Type", "Count", "% of Total"].map(th).join("")}</tr></thead>
  <tbody>
    ${EVENTS.map(({ key, label, hex }) => `
    <tr>
      <td style="padding:7px 12px;font-size:10pt;color:#1e293b;border-left:4px solid ${hex};font-weight:600">${label}</td>
      <td style="padding:7px 12px;font-size:10pt;color:#1e293b;text-align:right;font-weight:700">${fmt(summary[key] ?? 0)}</td>
      <td style="padding:7px 12px;font-size:10pt;color:#64748b;text-align:right">${pct(summary[key] ?? 0, summary.total_events)}%</td>
    </tr>`).join("")}
    <tr class="total-row">
      <td style="padding:7px 12px;font-size:10pt;border-left:4px solid #fff">TOTAL EVENTS</td>
      <td style="padding:7px 12px;font-size:10pt;text-align:right">${fmt(summary.total_events)}</td>
      <td style="padding:7px 12px;font-size:10pt;text-align:right">100%</td>
    </tr>
  </tbody>
</table>

${Object.keys(summary.by_account_type ?? {}).length ? `
<h2 style="font-size:11pt;margin-top:18px">By Account Type</h2>
<table>
  <thead><tr>${["Account Type", "Count", "% of Total"].map(th).join("")}</tr></thead>
  <tbody>
    ${Object.entries(summary.by_account_type).map(([k, v], i) =>
      `<tr style="${i % 2 === 1 ? "background:#f8fafc" : ""}">
        ${td(k)}${td(fmt(v), true, true)}${td(`${pct(v, summary.total_events)}%`, true)}
      </tr>`
    ).join("")}
  </tbody>
</table>` : ""}

${Object.keys(summary.by_risk_level ?? {}).length ? `
<h2 style="font-size:11pt;margin-top:18px">By Risk Level</h2>
<table>
  <thead><tr>${["Risk Level", "Count", "% of Total"].map(th).join("")}</tr></thead>
  <tbody>
    ${Object.entries(summary.by_risk_level).map(([k, v], i) =>
      `<tr style="${i % 2 === 1 ? "background:#f8fafc" : ""}">
        ${td(k)}${td(fmt(v), true, true)}${td(`${pct(v, summary.total_events)}%`, true)}
      </tr>`
    ).join("")}
  </tbody>
</table>` : ""}

${eventSections}

<div class="footer-bar">
  <span>RBT Bank Inc. — CONFIDENTIAL</span>
  <span>Generated: ${meta.generated_at}</span>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Account_Activity_Report_${sd(meta.date_from)}_to_${sd(meta.date_to)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── EventSection ──────────────────────────────────────────────────────────────

const EventSection = ({ event, rows }) => {
  const { label, Icon, bg, hex } = event;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">{label}</p>
            <p className="text-[11px] text-gray-400">{fmt(rows.length)} accounts</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {expanded && (
        rows.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 border-t border-gray-100">
            No accounts with this event in the selected date range.
          </p>
        ) : (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: hex + "18" }}>
                  <th className="px-3 py-2.5 text-center w-8 font-semibold text-gray-600">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Account No.</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Full Name</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Account Type</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Current Status</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Date Opened</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Event Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Branch</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Risk Level</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Uploaded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((c, i) => {
                  const sm = STATUS_META[c.status] ?? { label: c.status, hex: "#64748b", light: "#f1f5f9" };
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-[11px]">{c.account_no ?? "—"}</td>
                      <td className="px-4 py-2 font-semibold text-gray-800 max-w-[160px] truncate">{c.full_name}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{c.account_type}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: sm.light, color: sm.hex, border: `1px solid ${sm.hex}40` }}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{c.date_opened ?? "—"}</td>
                      <td className="px-3 py-2 text-center font-semibold" style={{ color: hex }}>{c.event_date ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {c.branch} <span className="text-gray-400 text-[10px]">({c.branch_brak})</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{c.risk_level}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[130px] truncate">{c.uploaded_by}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

// ── ReportPreview ─────────────────────────────────────────────────────────────

const ReportPreview = ({ basePath = "/compliance/reports" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const report   = location.state?.report;

  const [exporting, setExporting] = useState(null);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      if (type === "excel")     { await exportExcel(report); }
      else if (type === "pdf")  { await exportPDF(report); }
      else if (type === "word") { exportWord(report); }
    } finally {
      setExporting(null);
    }
  };

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 text-sm">No report data found. Please generate a report first.</p>
        <button
          onClick={() => navigate(basePath)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaArrowLeft /> Back to Reports
        </button>
      </div>
    );
  }

  const { meta, summary, customers_by_event } = report;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate(basePath)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <FaArrowLeft className="w-3 h-3" /> Back to Reports
          </button>
          <h1 className="text-xl font-bold text-gray-900">Customer Account Activity Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Period: <span className="font-medium">{meta.date_from}</span> – <span className="font-medium">{meta.date_to}</span>
            &nbsp;·&nbsp; {meta.branch_label} &nbsp;·&nbsp; Generated: {meta.generated_at}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handleExport("excel")} disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
            <FaFileExcel className="w-4 h-4" />
            {exporting === "excel" ? "Exporting…" : "Excel"}
          </button>
          <button onClick={() => handleExport("pdf")} disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-60 transition-colors shadow-sm">
            <FaFilePdf className="w-4 h-4" />
            {exporting === "pdf" ? "Exporting…" : "PDF"}
          </button>
          <button onClick={() => handleExport("word")} disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-sm">
            <FaFileWord className="w-4 h-4" />
            {exporting === "word" ? "Exporting…" : "Word"}
          </button>
        </div>
      </div>

      {/* ── Event summary cards ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Event Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <FaUsers className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Total Events</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{fmt(meta.total_events)}</p>
            </div>
          </div>
          {EVENTS.map(({ key, label, Icon, bg }) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900 leading-none">{fmt(summary[key] ?? 0)}</p>
                <p className="text-[10px] text-gray-400">{pct(summary[key] ?? 0, summary.total_events)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-3">By Account Type</h3>
          <div className="space-y-2.5">
            {Object.entries(summary.by_account_type ?? {}).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28 shrink-0">{type}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct(count, summary.total_events)}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{fmt(count)}</span>
              </div>
            ))}
            {!Object.keys(summary.by_account_type ?? {}).length && (
              <p className="text-xs text-gray-400">No data.</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-3">By Risk Level</h3>
          <div className="space-y-2.5">
            {Object.entries(summary.by_risk_level ?? {}).map(([level, count]) => (
              <div key={level} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28 shrink-0">{level}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: `${pct(count, summary.total_events)}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{fmt(count)}</span>
              </div>
            ))}
            {!Object.keys(summary.by_risk_level ?? {}).length && (
              <p className="text-xs text-gray-400">No risk level data.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Event sections ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Events by Status</p>
        <div className="space-y-4">
          {EVENTS.map((event) => (
            <EventSection
              key={event.key}
              event={event}
              rows={customers_by_event[event.key] ?? []}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

export default ReportPreview;
