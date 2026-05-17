const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function formatTanggalID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalLengkapID(date: Date): string {
  return `${HARI_ID[date.getDay()]}, ${formatTanggalID(date)}`;
}

export function formatJam(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/** ISO yyyy-mm-dd in local timezone */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add 1 month, clamping to last day if next month is shorter. Input: yyyy-mm-dd */
export function addOneMonthClamped(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const targetMonth = m; // 0-indexed next month = m
  const targetYear = targetMonth > 11 ? y + 1 : y;
  const normalizedMonth = targetMonth > 11 ? 0 : targetMonth;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return toISODate(new Date(targetYear, normalizedMonth, day));
}
