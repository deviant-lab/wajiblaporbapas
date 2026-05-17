import { createFileRoute } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Header } from "@/components/Header";
import { fetchKunjungan, type Kunjungan } from "@/services/kunjunganService";
import { fetchLaporan, type Laporan, getKategori } from "@/services/laporanService";
import { fetchTamu, type Tamu } from "@/services/tamuService";
import { supabase } from "@/lib/supabase";
import { formatTanggalID, toISODate } from "@/utils/dateUtils";
import { CalendarDays, Download, Inbox, Search, Trash2, Filter, Users, UserCheck, Baby, UserPlus } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Riwayat Aktivitas Terpadu — SIPADU" },
      { name: "description", content: "Pemantauan riwayat kunjungan terpadu harian, bulanan, dan tahunan." },
    ],
  }),
});

type FilterMode = "harian" | "bulanan" | "tahunan" | "semua";

function HistoryPage() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [kunjungan, setKunjungan] = useState<Kunjungan[]>([]);
  const [tamu, setTamu] = useState<Tamu[]>([]);
  
  const today = toISODate(new Date());

  // Filter & Search State
  const [q, setQ] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("harian");
  const [filterValue, setFilterValue] = useState<string>(today); 
  const [kategoriFilter, setKategoriFilter] = useState<string>("Semua");
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: "kunjungan" | "tamu" } | null>(null);

  useEffect(() => {
    fetchLaporan().then(setLaporan).catch(console.error);
    fetchKunjungan().then(setKunjungan).catch(console.error);
    fetchTamu().then(setTamu).catch(console.error);
  }, []);

  const klienById = useMemo(() => {
    const map = new Map<string, Laporan>();
    laporan.forEach((l) => map.set(l.id, l));
    return map;
  }, [laporan]);

  const handleFilterModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    if (mode === "harian") setFilterValue(today);
    else if (mode === "bulanan") setFilterValue(today.slice(0, 7)); 
    else if (mode === "tahunan") setFilterValue(today.slice(0, 4)); 
    else setFilterValue(""); 
  };

  const isMatchDate = (tanggalLapor: string) => {
    if (filterMode === "semua") return true;
    if (!tanggalLapor) return false;
    if (filterMode === "harian") return tanggalLapor === filterValue;
    if (filterMode === "bulanan") return tanggalLapor.startsWith(filterValue);
    if (filterMode === "tahunan") return tanggalLapor.startsWith(filterValue);
    return true;
  };

  // --- DATA WAJIB LAPOR ---
  const filteredWajibLapor = useMemo(() => {
    const list: any[] = [];

    kunjungan.forEach((k) => {
      if (!isMatchDate(k.tanggal)) return;
      const l = klienById.get(k.laporanId);
      list.push({
        id: k.id,
        type: "kunjungan",
        namaKlien: l?.namaKlien || k.namaKlien || "-",
        tanggalLahir: l?.tanggalLahir || "-",
        jenisKelamin: l?.jenisKelamin || "-",
        alamat: l?.alamat || "-",
        statusProgram: l?.statusProgram || k.statusProgram || "-",
        pasal: l?.pasal || "-",
        asalInstansi: l?.asalInstansi || "-",
        tanggalLapor: k.tanggal, 
        tanggalKembali: l?.tanggalKembali || "-",
        pembimbing: l?.pembimbing || k.petugas || "-",
        kategori: l ? getKategori(l) : "dewasa", 
      });
    });

    laporan.forEach((l) => {
      if (!isMatchDate(l.tanggalLapor)) return;
      const sudahAdaKunjungan = kunjungan.some((k) => k.laporanId === l.id && k.tanggal === l.tanggalLapor);
      if (!sudahAdaKunjungan) {
        list.push({
          id: l.id,
          type: "laporan",
          namaKlien: l.namaKlien,
          tanggalLahir: l.tanggalLahir,
          jenisKelamin: l.jenisKelamin,
          alamat: l.alamat,
          statusProgram: l.statusProgram,
          pasal: l.pasal,
          asalInstansi: l.asalInstansi,
          tanggalLapor: l.tanggalLapor,
          tanggalKembali: l.tanggalKembali,
          pembimbing: l.pembimbing,
          kategori: getKategori(l),
        });
      }
    });

    let result = list.sort((a, b) => b.tanggalLapor.localeCompare(a.tanggalLapor));

    if (kategoriFilter !== "Semua") {
      result = result.filter(item => item.kategori === kategoriFilter.toLowerCase());
    }

    if (q.trim()) {
      const s = q.toLowerCase();
      result = result.filter(item => 
        [item.namaKlien, item.alamat, item.pasal, item.asalInstansi, item.pembimbing].join(" ").toLowerCase().includes(s)
      );
    }
    return result;
  }, [kunjungan, laporan, klienById, filterMode, filterValue, kategoriFilter, q]);

  // --- DATA BUKU TAMU ---
  const filteredTamu = useMemo(() => {
    let result = tamu
      .filter((t) => isMatchDate(t.tanggal))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    if (q.trim()) {
      const s = q.toLowerCase();
      result = result.filter(item => 
        [item.namaTamu, item.asalInstansi, item.alamat, item.keperluan].join(" ").toLowerCase().includes(s)
      );
    }
    return result;
  }, [tamu, filterMode, filterValue, q]);

  const handleDelete = async (target: { id: string, type: "kunjungan" | "tamu" }) => {
    try {
      if (target.type === "kunjungan") {
        await supabase.from('kunjungan').delete().eq('id', target.id);
        setKunjungan((prev) => prev.filter((x) => x.id !== target.id));
      } else {
        await supabase.from('tamu').delete().eq('id', target.id);
        setTamu((prev) => prev.filter((x) => x.id !== target.id));
      }
      setConfirmDelete(null);
      toast.success("Riwayat dihapus");
    } catch (error) {
      toast.error("Gagal menghapus riwayat");
    }
  };

  const exportExcel = () => {
    if (filteredWajibLapor.length === 0 && filteredTamu.length === 0) {
      return toast.error("Tidak ada data untuk diexport pada filter ini");
    }
    
    const wb = XLSX.utils.book_new();

    if (filteredWajibLapor.length > 0) {
      const wlRows = filteredWajibLapor.map((item, i) => ({
        "No": i + 1,
        "Nama Klien": item.namaKlien,
        "Tanggal Lahir": item.tanggalLahir,
        "Jenis Kelamin": item.jenisKelamin,
        "Alamat": item.alamat,
        "Status Program": item.statusProgram,
        "Pasal": item.pasal,
        "Asal Instansi": item.asalInstansi,
        "Tanggal Lapor": item.tanggalLapor,
        "Tanggal Kembali": item.tanggalKembali,
        "Nama Pembimbing Kemasyarakatan": item.pembimbing,
      }));
      const wsWl = XLSX.utils.json_to_sheet(wlRows);
      XLSX.utils.book_append_sheet(wb, wsWl, "Wajib Lapor");
    }

    if (filteredTamu.length > 0) {
      const tamuRows = filteredTamu.map((item) => ({
        "Tanggal": item.tanggal,
        "Nama": item.namaTamu,
        "Alamat Instansi/Lapas/Rutan": item.asalInstansi,
        "Alamat Rumah": item.alamat,
        "Keperluan": item.keperluan,
      }));
      const wsTamu = XLSX.utils.json_to_sheet(tamuRows);
      XLSX.utils.book_append_sheet(wb, wsTamu, "Buku Tamu");
    }

    const fileName = `Riwayat-SIPADU-${filterMode}-${filterValue || "Keseluruhan"}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("File Excel berhasil diunduh");
  };

  // Menghitung statistik dinamis
  const statAnak = filteredWajibLapor.filter((i) => i.kategori === 'anak').length;
  const statDewasa = filteredWajibLapor.filter((i) => i.kategori === 'dewasa').length;
  const statTamu = filteredTamu.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" richColors closeButton />
      <Header />
      
      <main className="flex-1 mx-auto max-w-[95%] xl:max-w-7xl w-full px-4 sm:px-6 py-5 space-y-6">
        
        {/* === FILTER KONTROL ATAS === */}
        <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Riwayat Aktivitas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Pemantauan Wajib Lapor & Buku Tamu Terpadu.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select 
                value={filterMode} 
                onChange={(e) => handleFilterModeChange(e.target.value as FilterMode)}
                className="h-10 pl-9 pr-8 w-full md:w-auto rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none cursor-pointer"
              >
                <option value="harian">Harian</option>
                <option value="bulanan">Bulanan</option>
                <option value="tahunan">Tahunan</option>
                <option value="semua">Keseluruhan</option>
              </select>
            </div>

            {filterMode !== "semua" && (
              <input 
                type={filterMode === "harian" ? "date" : filterMode === "bulanan" ? "month" : "number"}
                placeholder={filterMode === "tahunan" ? "Tahun (contoh: 2024)" : ""}
                value={filterValue} 
                onChange={(e) => setFilterValue(e.target.value)} 
                className="h-10 px-3 w-full md:w-44 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
              />
            )}

            <div className="relative flex-1 w-full md:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari data..."
                className="h-10 pl-9 pr-3 w-full rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring" />
            </div>

            <button onClick={exportExcel}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors">
              <Download className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* === KARTU STATISTIK RINGKASAN === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Total Wajib Lapor Anak" 
            value={statAnak} 
            icon={<Baby className="h-6 w-6" />} 
            colorClass="bg-amber-500/15 text-amber-700 dark:text-amber-300" 
          />
          <StatCard 
            title="Total Wajib Lapor Dewasa" 
            value={statDewasa} 
            icon={<UserPlus className="h-6 w-6" />} 
            colorClass="bg-primary/15 text-primary" 
          />
          <StatCard 
            title="Total Buku Tamu" 
            value={statTamu} 
            icon={<Users className="h-6 w-6" />} 
            colorClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" 
          />
        </div>

        {/* === TABEL 1: WAJIB LAPOR === */}
        <section className="bg-card text-card-foreground rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" /> 
              Tabel Wajib Lapor
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Kategori:</span>
              <select 
                value={kategoriFilter} 
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="h-8 px-2 rounded-md border border-input bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
              >
                <option value="Semua">Semua</option>
                <option value="Anak">Anak Saja</option>
                <option value="Dewasa">Dewasa Saja</option>
              </select>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">{filteredWajibLapor.length} Data</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredWajibLapor.length === 0 ? (
              <EmptyState message="Tidak ada data wajib lapor. (Ubah filter waktu ke 'Keseluruhan' jika data dibuat di hari lain)" />
            ) : (
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3 text-left">Nama Klien</th>
                    <th className="px-4 py-3 text-left">Tanggal Lahir</th>
                    <th className="px-4 py-3 text-left">Jenis Kelamin</th>
                    <th className="px-4 py-3 text-left">Alamat</th>
                    <th className="px-4 py-3 text-left">Status Program</th>
                    <th className="px-4 py-3 text-left">Pasal</th>
                    <th className="px-4 py-3 text-left">Asal Instansi</th>
                    <th className="px-4 py-3 text-left">Tanggal Lapor</th>
                    <th className="px-4 py-3 text-left">Tanggal Kembali</th>
                    <th className="px-4 py-3 text-left">Nama Pembimbing Kemasyarakatan</th>
                    <th className="px-4 py-3 text-center sticky right-0 bg-muted/40 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredWajibLapor.map((item, index) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 text-center text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{item.namaKlien}</td>
                      <td className="px-4 py-2">{formatTanggalID(item.tanggalLahir)}</td>
                      <td className="px-4 py-2">{item.jenisKelamin}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate" title={item.alamat}>{item.alamat}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${item.statusProgram === 'PB' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-warning/20 text-warning-foreground border-warning/40'}`}>
                          {item.statusProgram}
                        </span>
                      </td>
                      <td className="px-4 py-2">{item.pasal}</td>
                      <td className="px-4 py-2">{item.asalInstansi}</td>
                      <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">{formatTanggalID(item.tanggalLapor)}</td>
                      <td className="px-4 py-2">{formatTanggalID(item.tanggalKembali)}</td>
                      <td className="px-4 py-2">{item.pembimbing}</td>
                      <td className="px-4 py-2 text-center sticky right-0 bg-card shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                        {item.type === "laporan" ? (
                          <span className="text-xs font-medium text-muted-foreground/50 select-none">-</span>
                        ) : (
                          <button onClick={() => setConfirmDelete({ id: item.id, type: "kunjungan" })}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* === TABEL 2: BUKU TAMU === */}
        <section className="bg-card text-card-foreground rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/10">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" /> 
              Tabel Buku Tamu
            </h3>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">{filteredTamu.length} Data</span>
          </div>

          <div className="overflow-x-auto">
            {filteredTamu.length === 0 ? (
              <EmptyState message="Tidak ada data buku tamu pada pilihan filter waktu ini." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left">Tanggal</th>
                    <th className="px-5 py-3 text-left">Nama</th>
                    <th className="px-5 py-3 text-left">Alamat Instansi/Lapas/Rutan</th>
                    <th className="px-5 py-3 text-left">Alamat Rumah</th>
                    <th className="px-5 py-3 text-left">Keperluan</th>
                    <th className="px-5 py-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTamu.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 align-top font-medium whitespace-nowrap">{formatTanggalID(item.tanggal)}</td>
                      <td className="px-5 py-3 align-top font-medium">{item.namaTamu}</td>
                      <td className="px-5 py-3 align-top">{item.asalInstansi}</td>
                      <td className="px-5 py-3 align-top">{item.alamat}</td>
                      <td className="px-5 py-3 align-top text-muted-foreground">{item.keperluan}</td>
                      <td className="px-5 py-3 align-top text-center">
                        <button onClick={() => setConfirmDelete({ id: item.id, type: "tamu" })}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Modal Konfirmasi Hapus */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
            <div className="bg-card text-card-foreground rounded-xl border border-border max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold tracking-tight">Hapus Baris Riwayat?</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Data riwayat ini akan dihapus secara permanen dari database.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setConfirmDelete(null)} className="h-10 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors">Batal</button>
                <button onClick={() => handleDelete(confirmDelete)} className="h-10 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity">Hapus Permanen</button>
              </div>
            </div>
          </div>
        )}

      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground mt-auto">
        SIPADU · Sistem Informasi Pelayanan dan Buku Tamu Terpadu
      </footer>
    </div>
  );
}

// Komponen Helper untuk Card Statistik
function StatCard({ title, value, icon, colorClass }: { title: string; value: number; icon: React.ReactNode; colorClass: string }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h4 className="text-2xl font-bold mt-0.5">{value} <span className="text-sm font-normal text-muted-foreground ml-0.5">Orang</span></h4>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground bg-card">
      <Inbox className="h-10 w-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}