import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Toaster, toast } from "sonner";
import * as XLSX from "xlsx";
import { Header } from "@/components/Header";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { fetchTamu, addTamu, type Tamu } from "@/services/tamuService";
import { supabase } from "@/lib/supabase";
import { formatTanggalID, toISODate } from "@/utils/dateUtils";
import { ArrowLeft, Loader2, RotateCcw, Save, UserCheck, Search, Download, Inbox, Trash2 } from "lucide-react";

export const Route = createFileRoute("/tamu")({
  component: BukuTamu,
  head: () => ({
    meta: [
      { title: "Buku Tamu — SIPADU" },
      { name: "description", content: "Catat kunjungan tamu instansi/lapas/rutan." },
    ],
  }),
});

interface FormState {
  namaTamu: string;
  asalInstansi: string;
  alamat: string;
  keperluan: string;
}
const emptyForm = (): FormState => ({ namaTamu: "", asalInstansi: "", alamat: "", keperluan: "" });

function BukuTamu() {
  const [data, setData] = useState<Tamu[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();
  const now = useRealtimeClock();
  const firstRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    fetchTamu().then(setData).catch(console.error);
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const required: Array<[keyof FormState, string]> = [
      ["namaTamu", "Nama Tamu"],
      ["asalInstansi", "Asal Instansi/Lapas/Rutan"],
      ["alamat", "Alamat Rumah"],
      ["keperluan", "Keperluan"],
    ];
    for (const [k, label] of required) {
      if (!form[k].trim()) {
        toast.error(`${label} wajib diisi`);
        formRef.current?.querySelector<HTMLElement>(`[name="${k}"]`)?.focus();
        return;
      }
    }
    
    setSubmitting(true);
    try {
      await addTamu({
        namaTamu: form.namaTamu.trim(),
        asalInstansi: form.asalInstansi.trim(),
        alamat: form.alamat.trim(),
        keperluan: form.keperluan.trim()
      });
      toast.success("Informasi sudah disimpan");
      setForm(emptyForm());
      const newData = await fetchTamu();
      setData(newData);
      navigate({ to: "/" });
    } catch (error) {
      toast.error("Gagal menyimpan data tamu");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(); };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Escape") { e.preventDefault(); setForm(emptyForm()); firstRef.current?.focus(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); submit(); return; }
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" && e.shiftKey) return;
      e.preventDefault();
      const focusables = Array.from(formRef.current!.querySelectorAll<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button[type="submit"]',
      )).filter((el) => !el.hasAttribute("data-skip-enter"));
      const idx = focusables.indexOf(target);
      if (idx >= 0 && idx < focusables.length - 1) focusables[idx + 1].focus();
      else submit();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('tamu').delete().eq('id', id);
      setData((p) => p.filter((x) => x.id !== id));
      setConfirmId(null);
      toast.success("Data tamu dihapus");
    } catch(e) {
      toast.error("Gagal menghapus data tamu");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sorted = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!s) return sorted;
    return sorted.filter((t) =>
      [t.namaTamu, t.asalInstansi, t.alamat, t.keperluan].join(" ").toLowerCase().includes(s),
    );
  }, [data, q]);

  const exportExcel = () => {
    if (data.length === 0) return toast.error("Tidak ada data untuk diexport");
    const rows = filtered.map((t, i) => ({
      No: i + 1,
      Tanggal: formatTanggalID(t.tanggal),
      Jam: t.jam,
      "Nama Tamu": t.namaTamu,
      "Asal Instansi/Lapas/Rutan": t.asalInstansi,
      "Alamat Rumah": t.alamat,
      Keperluan: t.keperluan,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buku Tamu");
    XLSX.writeFile(wb, `buku-tamu-${toISODate(new Date())}.xlsx`);
    toast.success("Buku tamu berhasil diexport");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" richColors closeButton />
      <Header />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-5 space-y-5">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>

        {/* Section Form */}
        <section className="bg-card text-card-foreground rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold">Form Input Buku Tamu</h2>
            <p className="text-xs text-muted-foreground">Isi data tamu dengan lengkap.</p>
          </div>
          <form ref={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Tamu" required>
              <input ref={firstRef} name="namaTamu" className="input" value={form.namaTamu}
                onChange={(e) => set("namaTamu", e.target.value)} placeholder="Nama lengkap tamu" />
            </Field>
            <Field label="Asal Instansi / Lapas / Rutan" required>
              <input name="asalInstansi" className="input" value={form.asalInstansi}
                onChange={(e) => set("asalInstansi", e.target.value)} placeholder="Instansi asal" />
            </Field>
            <Field label="Alamat Rumah" required className="md:col-span-2">
              <textarea name="alamat" rows={2} className="input resize-none" value={form.alamat}
                onChange={(e) => set("alamat", e.target.value)} placeholder="Alamat tamu" />
            </Field>
            <Field label="Keperluan" required className="md:col-span-2">
              <input name="keperluan" className="input" value={form.keperluan}
                onChange={(e) => set("keperluan", e.target.value)} placeholder="Tujuan kedatangan" />
            </Field>
            <div className="md:col-span-2 flex flex-wrap gap-2 pt-2 border-t border-border">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-10 text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Data
              </button>
              <button type="button" onClick={() => { setForm(emptyForm()); firstRef.current?.focus(); }} data-skip-enter
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 h-10 text-sm font-medium hover:bg-accent">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </form>
          <style>{`
            .input { width:100%; height:2.5rem; padding:0 .75rem; border-radius:.5rem; border:1px solid var(--color-input); background:var(--color-card); color:var(--color-card-foreground); font-size:.9rem; outline:none; }
            textarea.input { height:auto; padding:.5rem .75rem; }
            .input:focus { border-color: var(--color-ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ring) 20%, transparent); }
          `}</style>
        </section>

        {/* Section Table */}
        <section className="bg-card text-card-foreground rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2"><UserCheck className="h-5 w-5" /> Daftar Tamu</h2>
              <p className="text-xs text-muted-foreground">Total {data.length} tamu tercatat</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tamu..."
                  className="h-10 pl-9 pr-3 rounded-md border border-input bg-card text-sm w-56 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring" />
              </div>
              <button onClick={exportExcel} className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent">
                <Download className="h-4 w-4" /> Export
              </button>
            </div>
          </div>
          
          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-50 mb-2" />
              <p className="text-sm">Belum ada data tamu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Waktu</th>
                    <th className="px-5 py-3 font-medium">Nama & Instansi</th>
                    <th className="px-5 py-3 font-medium">Keperluan</th>
                    <th className="px-5 py-3 font-medium text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3 align-top whitespace-nowrap">
                        <div className="font-medium">{formatTanggalID(t.tanggal)}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">{t.jam}</div>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="font-medium">{t.namaTamu}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">{t.asalInstansi}</div>
                      </td>
                      <td className="px-5 py-3 align-top max-w-xs truncate" title={t.keperluan}>
                        {t.keperluan}
                      </td>
                      <td className="px-5 py-3 align-top text-center">
                        <button onClick={() => setConfirmId(t.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal Hapus */}
        {confirmId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmId(null)}>
            <div className="bg-card text-card-foreground rounded-xl border border-border max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Hapus data tamu?</h3>
              <p className="text-sm text-muted-foreground mt-1">Data tidak dapat dikembalikan.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmId(null)} className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent">Batal</button>
                <button onClick={() => handleDelete(confirmId)} className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm hover:opacity-90">Hapus</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-foreground/80">{label}{required && <span className="text-destructive ml-0.5">*</span>}</span>
      {children}
    </label>
  );
}