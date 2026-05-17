import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Header } from "@/components/Header";
import { ReportForm } from "@/components/ReportForm";
import { ReportTable } from "@/components/ReportTable";
import { fetchLaporan, addLaporan, type Laporan, getKategori } from "@/services/laporanService";
import { addKunjungan } from "@/services/kunjunganService";
import { formatJam } from "@/utils/dateUtils";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/lapor/anak")({
  component: LaporAnak,
  head: () => ({
    meta: [
      { title: "Wajib Lapor Anak — SIPADU" },
      { name: "description", content: "Form input wajib lapor untuk klien anak." },
    ],
  }),
});

function LaporAnak() {
  const [data, setData] = useState<Laporan[]>([]);
  const [editing, setEditing] = useState<Laporan | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLaporan().then(setData).catch(console.error);
  }, []);

  const filtered = data.filter((l) => getKategori(l) === "anak");

  const handleSubmit = async (l: Omit<Laporan, 'id' | 'createdAt'>) => {
    try {
      const inserted = await addLaporan(l);
      
      // Auto lapor saat pendaftaran anak
      if (inserted && inserted.length > 0) {
        const newId = inserted[0].id;
        await addKunjungan({
          laporanId: newId,
          tanggal: l.tanggalLapor,
          jam: formatJam(new Date()).slice(0, 5),
          petugas: l.pembimbing,
          catatan: "Lapor perdana (Otomatis via input Geotagging)",
        });
      }

      toast.success("Data berhasil ditambahkan & otomatis tercatat melapor");
      const newData = await fetchLaporan();
      setData(newData);
    } catch (error) {
      toast.error("Gagal menyimpan data");
    }
  };

  const handleUpdate = async (l: Laporan) => {
    try {
      const { error } = await supabase.from('laporan').update({
        kategori: l.kategori,
        nama_klien: l.namaKlien,
        tanggal_lahir: l.tanggalLahir,
        jenis_kelamin: l.jenisKelamin,
        alamat: l.alamat,
        status_program: l.statusProgram,
        pasal: l.pasal,
        asal_instansi: l.asalInstansi,
        tanggal_lapor: l.tanggalLapor,
        tanggal_kembali: l.tanggalKembali,
        pembimbing: l.pembimbing,
        latitude: l.geotag?.latitude,
        longitude: l.geotag?.longitude,
        geo_accuracy: l.geotag?.accuracy,
        geo_captured_at: l.geotag?.capturedAt
      }).eq('id', l.id);
      
      if (error) throw error;
      toast.success("Data berhasil diperbarui");
      const newData = await fetchLaporan();
      setData(newData);
    } catch (e) { 
      toast.error("Gagal update data"); 
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('laporan').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((x) => x.id !== id));
      toast.success("Data dihapus");
    } catch(e) { 
      toast.error("Gagal menghapus"); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" richColors closeButton />
      <Header />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-5 space-y-5">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>
        <ReportForm
          kategori="anak"
          editing={editing}
          onSubmit={handleSubmit}
          onUpdate={handleUpdate}
          onCancelEdit={() => setEditing(null)}
          onAfterSave={() => navigate({ to: "/" })}
        />
        <ReportTable data={filtered} onEdit={setEditing} onDelete={handleDelete} title="Data Wajib Lapor Anak" />
      </main>
      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        SIPADU · Sistem Informasi Pelayanan dan Buku Tamu Terpadu
      </footer>
    </div>
  );
}