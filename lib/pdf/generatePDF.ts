import { jsPDF } from 'jspdf'
import { LogEntry, Profile } from '@/lib/types'
import { format } from 'date-fns'

// Install jsPDF if not already present
// npm install jspdf

const ROLE_LABELS: Record<string, string> = {
  guide: 'Guide',
  trip_leader: 'Trip Leader',
  guide_instructor: 'Guide Instructor',
  private: 'Private',
}
const BOAT_LABELS: Record<string, string> = {
  paddle: 'Paddle',
  oar: 'Oar',
  combined: 'Combined',
}

type Doc = InstanceType<typeof jsPDF>

function line(doc: Doc, x1: number, y1: number, x2: number, y2: number) {
  doc.line(x1, y1, x2, y2)
}

function text(doc: Doc, str: string, x: number, y: number, opts?: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right' }) {
  doc.setFontSize(opts?.size ?? 8)
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
  doc.text(str, x, y, { align: opts?.align ?? 'left' })
}

type Totals = {
  guide_h: number; tl_h: number; gi_h: number; priv_h: number
  guide_mi: number; tl_mi: number; gi_mi: number; priv_mi: number
}

function computeTotals(entries: LogEntry[]): Totals {
  const sum = (role: string, key: 'hours' | 'miles') =>
    entries.filter(e => e.role === role).reduce((s, e) => s + e[key], 0)
  return {
    guide_h: sum('guide', 'hours'), tl_h: sum('trip_leader', 'hours'),
    gi_h: sum('guide_instructor', 'hours'), priv_h: sum('private', 'hours'),
    guide_mi: sum('guide', 'miles'), tl_mi: sum('trip_leader', 'miles'),
    gi_mi: sum('guide_instructor', 'miles'), priv_mi: sum('private', 'miles'),
  }
}

function renderPage(doc: Doc, profile: Profile, pageEntries: LogEntry[], pageNum: number, totalPages: number, grandTotals?: Totals) {
  const M = 10  // margin
  const PW = 210 // page width (A4 mm)
  const COL = PW - M * 2 // content width

  // Header box
  doc.setFillColor(20, 20, 20)
  doc.rect(M, M, COL, 8, 'F')
  text(doc, 'STATE OF COLORADO', M + 2, M + 5.5, { bold: true, size: 9 })
  text(doc, 'ON-RIVER LOG SHEET', M + COL / 2, M + 5.5, { bold: true, size: 9, align: 'center' })

  // Division label
  text(doc, 'DIVISION OF PARKS & WILDLIFE', M, M + 13, { bold: true, size: 7 })

  // River Outfitter Licensing Program label (top right)
  text(doc, 'River Outfitter', M + COL - 28, M + 12, { size: 6.5 })
  text(doc, 'Licensing Program', M + COL - 28, M + 15.5, { size: 6.5 })

  // Guide Name section
  text(doc, 'GUIDE NAME:', M, M + 21, { bold: true, size: 7 })

  // Name fields
  const nameY = M + 26
  const nameFields = [
    { label: 'Last', x: M, w: 50 },
    { label: 'First', x: M + 52, w: 40 },
    { label: 'Middle', x: M + 94, w: 60 },
    { label: 'Date of Birth', x: M + 156, w: 34 },
  ]
  doc.setDrawColor(180)
  nameFields.forEach(f => {
    text(doc, f.label, f.x, nameY, { size: 6.5 })
    line(doc, f.x, nameY + 4, f.x + f.w - 1, nameY + 4)
    // Fill values
    const val = f.label === 'Last' ? profile.last_name
      : f.label === 'First' ? profile.first_name
      : f.label === 'Middle' ? (profile.middle_name ?? '')
      : profile.date_of_birth ? format(new Date(profile.date_of_birth + 'T00:00:00'), 'MM/dd/yyyy') : ''
    text(doc, val, f.x, nameY + 2.5, { size: 7.5, bold: true })
  })

  // Entries
  const entryStartY = M + 36
  const ENTRY_H = 16
  doc.setDrawColor(160)

  pageEntries.forEach((entry, i) => {
    const y = entryStartY + i * ENTRY_H

    // Top row: Date | River | Put-in | Take-out
    doc.setDrawColor(120)
    doc.rect(M, y, COL, ENTRY_H, 'S')

    // Date
    text(doc, 'Date', M + 1, y + 3, { size: 5.5 })
    text(doc, format(new Date(entry.date + 'T00:00:00'), 'MM/dd/yyyy'), M + 1, y + 7, { size: 7, bold: true })

    // River
    text(doc, 'River', M + 28, y + 3, { size: 5.5 })
    text(doc, entry.river, M + 28, y + 7, { size: 7, bold: true })
    line(doc, M + 27, y, M + 27, y + ENTRY_H)

    // Boat type (Paddle/Oar/Combined checkboxes)
    const boatX = M + 55
    text(doc, 'Paddle', boatX, y + 3, { size: 5 })
    text(doc, 'Oar', boatX, y + 6.5, { size: 5 })
    text(doc, 'Combined', boatX, y + 10, { size: 5 })
    // Checkmark
    const checkY = entry.boat_type === 'paddle' ? y + 2 : entry.boat_type === 'oar' ? y + 5.5 : y + 9
    doc.setFillColor(0, 0, 0)
    doc.circle(boatX - 2, checkY + 0.5, 1, 'F')
    line(doc, M + 53, y, M + 53, y + ENTRY_H)

    // Role (Guide / Trip Leader / Guide Instructor) + Trip Type
    const roleX = M + 73
    text(doc, 'Guide', roleX, y + 3, { size: 5 })
    text(doc, 'Trip Leader', roleX, y + 6.5, { size: 5 })
    text(doc, 'Guide Instructor', roleX, y + 10, { size: 5 })
    if (entry.role !== 'private') {
      const roleCheckY = entry.role === 'guide' ? y + 2 : entry.role === 'trip_leader' ? y + 5.5 : y + 9
      doc.circle(roleX - 2, roleCheckY + 0.5, 1, 'F')
    }
    text(doc, entry.role === 'private' ? 'PRIVATE' : 'COMMERCIAL', roleX - 2, y + 14, { size: 4.5, bold: true })
    line(doc, M + 71, y, M + 71, y + ENTRY_H)

    // Hours
    text(doc, '# Hours', M + 97, y + 3, { size: 5 })
    text(doc, 'on River', M + 97, y + 6, { size: 5 })
    text(doc, String(entry.hours), M + 97, y + 12, { size: 9, bold: true })
    line(doc, M + 95, y, M + 95, y + ENTRY_H)

    // Miles
    text(doc, '# River', M + 113, y + 3, { size: 5 })
    text(doc, 'Miles', M + 113, y + 6, { size: 5 })
    text(doc, String(entry.miles), M + 113, y + 12, { size: 9, bold: true })
    line(doc, M + 111, y, M + 111, y + ENTRY_H)

    // Put-in / Take-out
    text(doc, 'Put-in', M + 129, y + 3, { size: 5 })
    text(doc, entry.put_in, M + 129, y + 7, { size: 6.5, bold: true })
    text(doc, 'Take-out', M + 129, y + 10, { size: 5 })
    text(doc, entry.take_out, M + 129, y + 13.5, { size: 6.5, bold: true })
    line(doc, M + 127, y, M + 127, y + ENTRY_H)

    // Company / ROL
    text(doc, 'Company', M + 162, y + 3, { size: 5 })
    const compName = entry.company_name.length > 18 ? entry.company_name.substring(0, 16) + '…' : entry.company_name
    text(doc, compName, M + 162, y + 7, { size: 6, bold: true })
    text(doc, 'ROL License#', M + 162, y + 10, { size: 5 })
    text(doc, entry.rol_license, M + 162, y + 13.5, { size: 6.5, bold: true })
    line(doc, M + 160, y, M + 160, y + ENTRY_H)
  })

  // Empty rows if < 9 entries on this page
  for (let i = pageEntries.length; i < 9; i++) {
    const y = entryStartY + i * ENTRY_H
    doc.setDrawColor(200)
    doc.rect(M, y, COL, ENTRY_H, 'S')
    // Column dividers
    ;[27, 53, 71, 95, 111, 127, 160].forEach((cx: number) => {
      line(doc, M + cx, y, M + cx, y + ENTRY_H)
    })
  }

  // Totals box
  const totY = entryStartY + 9 * ENTRY_H + 2
  doc.setFillColor(230, 230, 230)
  doc.rect(M, totY, COL, 14, 'FD')
  text(doc, 'TOTALS FOR THIS SHEET', M + 2, totY + 4, { bold: true, size: 7 })

  const guide_h = pageEntries.filter(e => e.role === 'guide').reduce((s, e) => s + e.hours, 0)
  const tl_h = pageEntries.filter(e => e.role === 'trip_leader').reduce((s, e) => s + e.hours, 0)
  const gi_h = pageEntries.filter(e => e.role === 'guide_instructor').reduce((s, e) => s + e.hours, 0)
  const priv_h = pageEntries.filter(e => e.role === 'private').reduce((s, e) => s + e.hours, 0)
  const guide_mi = pageEntries.filter(e => e.role === 'guide').reduce((s, e) => s + e.miles, 0)
  const tl_mi = pageEntries.filter(e => e.role === 'trip_leader').reduce((s, e) => s + e.miles, 0)
  const gi_mi = pageEntries.filter(e => e.role === 'guide_instructor').reduce((s, e) => s + e.miles, 0)
  const priv_mi = pageEntries.filter(e => e.role === 'private').reduce((s, e) => s + e.miles, 0)

  text(doc, `River Miles as Guide: ${guide_mi.toFixed(1)}`, M + 2, totY + 9, { size: 6.5 })
  text(doc, `As Trip Leader: ${tl_mi.toFixed(1)}`, M + 44, totY + 9, { size: 6.5 })
  text(doc, `As Guide Instructor: ${gi_mi.toFixed(1)}`, M + 88, totY + 9, { size: 6.5 })
  text(doc, `Private: ${priv_mi.toFixed(1)}`, M + 136, totY + 9, { size: 6.5 })

  text(doc, `Hours as Guide: ${guide_h.toFixed(1)}`, M + 2, totY + 13, { size: 6.5 })
  text(doc, `As Trip Leader: ${tl_h.toFixed(1)}`, M + 44, totY + 13, { size: 6.5 })
  text(doc, `As Guide Instructor: ${gi_h.toFixed(1)}`, M + 88, totY + 13, { size: 6.5 })
  text(doc, `Private: ${priv_h.toFixed(1)}`, M + 136, totY + 13, { size: 6.5 })

  // Grand totals box (all logged trips) — rendered on the last page only
  if (grandTotals) {
    const gY = totY + 18
    doc.setFillColor(20, 20, 20)
    doc.rect(M, gY, COL, 5, 'F')
    text(doc, `GRAND TOTALS — ALL LOGGED TRIPS (${totalPages} sheet${totalPages > 1 ? 's' : ''})`, M + 2, gY + 3.5, { bold: true, size: 7 })

    doc.setFillColor(240, 240, 240)
    doc.rect(M, gY + 5, COL, 10, 'FD')
    text(doc, `River Miles as Guide: ${grandTotals.guide_mi.toFixed(1)}`, M + 2, gY + 9, { size: 6.5, bold: true })
    text(doc, `As Trip Leader: ${grandTotals.tl_mi.toFixed(1)}`, M + 44, gY + 9, { size: 6.5, bold: true })
    text(doc, `As Guide Instructor: ${grandTotals.gi_mi.toFixed(1)}`, M + 88, gY + 9, { size: 6.5, bold: true })
    text(doc, `Private: ${grandTotals.priv_mi.toFixed(1)}`, M + 136, gY + 9, { size: 6.5, bold: true })

    text(doc, `Hours as Guide: ${grandTotals.guide_h.toFixed(1)}`, M + 2, gY + 13, { size: 6.5, bold: true })
    text(doc, `As Trip Leader: ${grandTotals.tl_h.toFixed(1)}`, M + 44, gY + 13, { size: 6.5, bold: true })
    text(doc, `As Guide Instructor: ${grandTotals.gi_h.toFixed(1)}`, M + 88, gY + 13, { size: 6.5, bold: true })
    text(doc, `Private: ${grandTotals.priv_h.toFixed(1)}`, M + 136, gY + 13, { size: 6.5, bold: true })
  }

  // Page number
  text(doc, `Page ${pageNum} of ${totalPages}`, PW / 2, 295, { size: 7, align: 'center' })
}

export async function generateLogSheetPDF(profile: Profile, entries: LogEntry[]): Promise<Blob> {
  // Dynamically import jsPDF to keep it client-side only
  const { jsPDF } = await import('jspdf')

  const entriesPerPage = 9
  const totalPages = Math.ceil(entries.length / entriesPerPage)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const grandTotals = computeTotals(entries)

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage()
    const pageEntries = entries.slice(p * entriesPerPage, (p + 1) * entriesPerPage)
    const isLastPage = p === totalPages - 1
    renderPage(doc, profile, pageEntries, p + 1, totalPages, isLastPage ? grandTotals : undefined)
  }

  return doc.output('blob')
}
