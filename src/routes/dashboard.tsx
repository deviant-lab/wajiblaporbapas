import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Header } from "@/components/Header";
import { fetchLaporan, type Laporan, getKategori } from "@/services/laporanService";
import { fetchKunjungan, type Kunjungan } from "@/services/kunjunganService";
import { fetchTamu, type Tamu } from "@/services/tamuService";
import { formatTanggalID, toISODate } from "@/utils/dateUtils";
import { Users, UserCheck, AlertTriangle, CalendarClock, BookOpenCheck, Baby } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard Statistik Terpadu — SIPADU" },
      { name: "description", content: "Statistik dan grafik wajib lapor dan buku tamu digital." },
    ],
  }),
});

const COLORS = ["hsl(var(--chart-1, 220 90% 56%))", "hsl(var(--chart-2, 30 90% 55%))", "hsl(var(--chart-3, 160 70% 45%))", "hsl(var(--chart-4, 340 80% 60%))"];
const BAR_PB = "oklch(0.55 0.18 250)";
const BAR_CB = "oklch(0.7 0.15 50)";
const LINE_TAMU = "oklch(0.65 0.15 150)";

function DashboardPage() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [kunjungan, setKunjungan] = useState<Kunjungan[]>([]);
  const [tamu, setTamu] = useState<Tamu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchLaporan(), fetchKunjungan(), fetchTamu()])
      .then(([laporanData, kunjunganData, tamuData]) => {
        setLaporan(laporanData);
        setKunjungan(kunjunganData);
        setTamu(tamuData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = toISODate(new Date());

  // Satukan Kunjungan Aktual & Lapor Perdana untuk hitungan yang akurat
  const unifiedLapor = useMemo(() => {
    const list: Array<{ tanggal: string; statusProgram: string; petugas: string }> = [];
    
    kunjungan.forEach((k) => {
      const l = laporan.find((x) => x.id === k.laporanId);
      list.push({ tanggal: k.tanggal, statusProgram: l?.statusProgram || "PB", petugas: k.petugas });
    });

    laporan.forEach((l) => {
      const hasKunjungan = kunjungan.some((k) => k.laporanId === l.id && k.tanggal === l.tanggalLapor);
      if (!hasKunjungan) {
        list.push({ tanggal: l.tanggalLapor, statusProgram: l.statusProgram, petugas: l.pembimbing });
      }
    });

    return list;
  }, [laporan, kunjungan]);

  const stats = useMemo(() => {
    const total = laporan.length;
    const anak = laporan.filter((l) => getKategori(l) === "anak").length;
    const dewasa = laporan.filter((l) => getKategori(l) === "dewasa").length;
    
    const todayLapor = unifiedLapor.filter((k) => k.tanggal === today).length;
    const todayTamu = tamu.filter((t) => t.tanggal === today).length;

    const overdue = laporan.filter((l) => l.tanggalKembali && l.tanggalKembali < today).length;
    const in7days = laporan.filter((l) => {
      if (!l.tanggalKembali) return false;
      return l.tanggalKembali >= today && l.tanggalKembali <= toISODate(new Date(Date.now() + 7 * 86400000));
    }).length;

    return { total, anak, dewasa, todayLapor, totalTamu: tamu.length, todayTamu, overdue, in7days };
  }, [laporan, unifiedLapor, tamu, today]);

  const visitsTrend = useMemo(() => {
    const days: any[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODate(d);
      
      const laporDay = unifiedLapor.filter((k) => k.tanggal === iso);
      const tamuDay = tamu.filter((t) => t.tanggal === iso);
      
      days.push({
        tanggal: iso,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        pb: laporDay.filter((k) => k.statusProgram === "PB").length,
        cb: laporDay.filter((k) => k.statusProgram === "CB").length,
        tamu: tamuDay.length,
      });
    }
    return days;
  }, [unifiedLapor, tamu]);

  const monthlyReg = useMemo(() => {
    const arr: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      const total = laporan.filter((l) => (l.tanggalLapor ?? "").startsWith(key)).length;
      arr.push({ label, key, total });
    }
    return arr;
  }, [laporan]);

  const statusData = [
    { name: "PB (Pembebasan)", value: laporan.filter(l => l.statusProgram === "PB").length },
    { name: "CB (Cuti)", value: laporan.filter(l => l.statusProgram === "CB").length },
  ];
  
  const kategoriData = [
    { name: "Dewasa", value: stats.dewasa },
    { name: "Anak", value: stats.anak },
  ];

  const topPetugas = useMemo(() => {
    const map = new Map<string, number>();
    unifiedLapor.forEach((k) => map.set(k.petugas, (map.get(k.petugas) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([nama, total]) => ({ nama, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [unifiedLapor]);

  const upcoming = useMemo(() => {
    return [...laporan]
      .filter((l) => l.tanggalKembali && l.tanggalKembali >= today)
      .sort((a, b) => a.tanggalKembali.localeCompare(b.tanggalKembali))
      .slice(0, 5);
  }, [laporan, today]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-5 space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Dashboard Statistik Terpadu</h2>
          <p className="text-sm text-muted-foreground">Ringkasan data wajib lapor dan buku tamu secara real-time.</p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Memuat data dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={<Users className="h-5 w-5" />} label="Klien Dewasa" value={stats.dewasa} hint="Total Klien" />
              <StatCard icon={<Baby className="h-5 w-5" />} label="Klien Anak" value={stats.anak} hint="Total Klien" />
              <StatCard icon={<UserCheck className="h-5 w-5" />} label="Lapor Hari Ini" value={stats.todayLapor} hint="Aktivitas Klien" accent="primary" />
              
              <StatCard icon={<BookOpenCheck className="h-5 w-5" />} label="Total Tamu" value={stats.totalTamu} hint="Sejak awal" />
              <StatCard icon={<CalendarClock className="h-5 w-5" />} label="Jatuh Tempo" value={stats.in7days} hint="Dalam 7 hari" accent="warning" />
              <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Terlambat" value={stats.overdue} hint="Lewat batas lapor" accent="destructive" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="Tren Aktivitas 14 Hari Terakhir" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={visitsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0 / 0.4)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pb" name="Wajib Lapor PB" stroke={BAR_PB} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="cb" name="Wajib Lapor CB" stroke={BAR_CB} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="tamu" name="Buku Tamu" stroke={LINE_TAMU} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Kategori Klien Terdaftar">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={kategoriData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                      {kategoriData.map((_, i) => <Cell key={i} fill={i === 0 ? BAR_PB : LINE_TAMU} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Pendaftaran Klien Baru 6 Bulan Terakhir" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyReg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0 / 0.4)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Pendaftar Baru" fill={BAR_PB} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Distribusi Program Klien">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusData.map((_, i) => <Cell key={i} fill={i === 0 ? BAR_PB : BAR_CB} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Top 5 Petugas Wajib Lapor (Jumlah Pencatatan)">
                {topPetugas.length === 0 ? (
                  <EmptyHint text="Belum ada data petugas." />
                ) : (
                  <ul className="divide-y divide-border">
                    {topPetugas.map((p, i) => (
                      <li key={p.nama} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="flex items-center gap-3">
                          <span className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                          <span className="font-medium">{p.nama}</span>
                        </span>
                        <span className="text-muted-foreground tabular-nums">{p.total} lapor</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>

              <ChartCard title="Jadwal Lapor Berikutnya (Akan Datang)">
                {upcoming.length === 0 ? (
                  <EmptyHint text="Belum ada jadwal mendatang." />
                ) : (
                  <ul className="divide-y divide-border">
                    {upcoming.map((l) => (
                      <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                            l.statusProgram === "PB"
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-warning/20 text-warning-foreground border-warning/40"
                          }`}>{l.statusProgram}</span>
                          <span className="font-medium">{l.namaKlien}</span>
                        </span>
                        <span className="text-muted-foreground">{formatTanggalID(l.tanggalKembali)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </main>
      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        SIPADU · Sistem Informasi Pelayanan dan Buku Tamu Terpadu
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, hint, accent = "default" }: { icon: React.ReactNode; label: string; value: number; hint?: string; accent?: "default" | "primary" | "warning" | "destructive" }) {
  const accentCls =
    accent === "primary" ? "bg-primary/10 text-primary"
    : accent === "warning" ? "bg-warning/20 text-warning-foreground"
    : accent === "destructive" ? "bg-destructive/10 text-destructive"
    : "bg-muted text-foreground";
  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate pr-2">{label}</p>
        <span className={`h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md ${accentCls}`}>{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card text-card-foreground rounded-xl border border-border shadow-card ${className}`}>
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{text}</p>;
}