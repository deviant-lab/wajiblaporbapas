import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { addOneMonthClamped, toISODate } from "@/utils/dateUtils";
import type { Laporan, JenisKelamin, StatusProgram, KategoriLapor } from "@/services/laporanService";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Loader2, Save, RotateCcw, Keyboard, MapPin, RefreshCw, AlertTriangle } from "lucide-react";

type FormState = Omit<Laporan, "id" | "createdAt" | "geotag">;

function emptyForm(kategori: KategoriLapor): FormState {
  const today = toISODate(new Date());
  return {
    kategori,
    namaKlien: "",
    tanggalLahir: "",
    jenisKelamin: "Laki-laki",
    alamat: "",
    statusProgram: "PB",
    pasal: "",
    asalInstansi: "",
    tanggalLapor: today,
    tanggalKembali: addOneMonthClamped(today),
    pembimbing: "",
  };
}

interface Props {
  kategori: KategoriLapor;
  onSubmit: (data: Omit<Laporan, "id" | "createdAt">) => Promise<void>;
  editing: Laporan | null;
  onCancelEdit: () => void;
  onUpdate: (data: Laporan) => Promise<void>;
  onAfterSave?: () => void;
}

export function ReportForm({ kategori, onSubmit, editing, onCancelEdit, onUpdate, onAfterSave }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm(kategori));
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { geotag, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation(true);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  useEffect(() => {
    if (editing) {
      const { id: _i, createdAt: _c, geotag: _g, ...rest } = editing;
      setForm({ ...rest, kategori });
      firstFieldRef.current?.focus();
    }
  }, [editing, kategori]);

  useEffect(() => {
    if (editing) return;
    const today = toISODate(new Date());
    setForm((f) =>
      f.tanggalLapor === today ? f : { ...f, tanggalLapor: today, tanggalKembali: addOneMonthClamped(today) },
    );
  }, [editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm(emptyForm(kategori));
    onCancelEdit();
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  const submit = async () => {
    const required: Array<[keyof FormState, string]> = [
      ["namaKlien", "Nama Klien"],
      ["tanggalLahir", "Tanggal Lahir"],
      ["alamat", "Alamat"],
      ["pasal", "Pasal / Perkara"],
      ["asalInstansi", "Asal Instansi"],
      ["pembimbing", "Nama Pembimbing Kemasyarakatan"],
    ];
    for (const [k, label] of required) {
      if (!String(form[k]).trim()) {
        toast.error(`${label} wajib diisi`);
        formRef.current?.querySelector<HTMLElement>(`[name="${k}"]`)?.focus();
        return;
      }
    }
    
    setSubmitting(true);
    try {
      if (editing) {
        await onUpdate({ ...editing, ...form, geotag: editing.geotag ?? geotag ?? null });
      } else {
        await onSubmit({ ...form, geotag: geotag ?? null });
      }
      setForm(emptyForm(kategori));
      onCancelEdit();
      onAfterSave?.();
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => { e.preventDefault(); submit(); };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Escape") { e.preventDefault(); reset(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); submit(); return; }
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" && e.shiftKey) return;
      e.preventDefault();
      const focusables = Array.from(
        formRef.current!.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button[type="submit"]',
        ),
      ).filter((el) => !el.hasAttribute("data-skip-enter"));
      const idx = focusables.indexOf(target);
      if (idx >= 0 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
        const next = focusables[idx + 1] as HTMLInputElement;
        if (next.select) try { next.select(); } catch {}
      } else submit();
    }
  };

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); submit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form, editing]);

  const tanggalKembaliComputed = useMemo(
    () => (form.tanggalLapor ? addOneMonthClamped(form.tanggalLapor) : ""),
    [form.tanggalLapor],
  );
  useEffect(() => {
    if (form.tanggalKembali !== tanggalKembaliComputed) set("tanggalKembali", tanggalKembaliComputed);
  }, [tanggalKembaliComputed]);

  const labelKategori = kategori === "anak" ? "Anak" : "Dewasa";

  return (
    <section className="bg-card text-card-foreground rounded-xl border border-border shadow-card">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {editing ? `Edit Data Wajib Lapor ${labelKategori}` : `Form Input Wajib Lapor ${labelKategori}`}
          </h2>
          <p className="text-xs text-muted-foreground">
            Tekan <kbd className="kbd">Enter</kbd> pindah field, <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">S</kbd> simpan, <kbd className="kbd">Esc</kbd> reset.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Keyboard className="h-4 w-4" /> Optimized untuk input keyboard
        </div>
      </div>

      <form ref={formRef} onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nama Klien" required>
          <input ref={firstFieldRef} name="namaKlien" className="input" value={form.namaKlien}
            onChange={(e) => set("namaKlien", e.target.value)} placeholder="Nama lengkap klien" autoComplete="off" />
        </Field>

        <Field label="Tanggal Lahir" required>
          <input type="date" name="tanggalLahir" className="input" value={form.tanggalLahir}
            onChange={(e) => set("tanggalLahir", e.target.value)} />
        </Field>

        <Field label="Jenis Kelamin" required>
          <select name="jenisKelamin" className="input" value={form.jenisKelamin}
            onChange={(e) => set("jenisKelamin", e.target.value as JenisKelamin)}>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </Field>

        <Field label="Status Program" required>
          <select name="statusProgram" className="input" value={form.statusProgram}
            onChange={(e) => set("statusProgram", e.target.value as StatusProgram)}>
            <option value="PB">PB - Pembebasan Bersyarat</option>
            <option value="CB">CB - Cuti Bersyarat</option>
          </select>
        </Field>

        <Field label="Alamat" required className="md:col-span-2">
          <textarea name="alamat" rows={2} className="input resize-none" value={form.alamat}
            onChange={(e) => set("alamat", e.target.value)} placeholder="Alamat lengkap sesuai identitas" />
        </Field>

        <Field label="Pasal / Perkara" required>
          <input name="pasal" className="input" value={form.pasal}
            onChange={(e) => set("pasal", e.target.value)} placeholder="cth: Pasal 363 KUHP" autoComplete="off" />
        </Field>

        <Field label="Asal Instansi" required>
          <input name="asalInstansi" className="input" value={form.asalInstansi}
            onChange={(e) => set("asalInstansi", e.target.value)} placeholder="cth: Lapas Klas IIA Bandung" autoComplete="off" />
        </Field>

        <Field label="Tanggal Lapor (otomatis)">
          <input type="date" name="tanggalLapor" className="input bg-muted cursor-not-allowed" value={form.tanggalLapor} readOnly tabIndex={-1} />
        </Field>

        <Field label="Tanggal Kembali (+1 bulan, otomatis)">
          <input type="date" name="tanggalKembali" className="input bg-muted cursor-not-allowed" value={form.tanggalKembali} readOnly tabIndex={-1} />
        </Field>

        <Field label="Nama Pembimbing Kemasyarakatan" required className="md:col-span-2">
          <input name="pembimbing" className="input" value={form.pembimbing}
            onChange={(e) => set("pembimbing", e.target.value)} placeholder="Nama PK" autoComplete="off" />
        </Field>

        <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-3">
          <div className={`h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0 ${
            geotag ? "bg-success/15 text-success" : geoError ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          }`}>
            {geoError ? <AlertTriangle className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Geotagging Lokasi Lapor</span>
              {geoLoading && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> mengambil…</span>}
            </div>
            {geotag ? (
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {geotag.latitude.toFixed(6)}, {geotag.longitude.toFixed(6)}
                {geotag.accuracy ? ` · ±${Math.round(geotag.accuracy)}m` : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {geoError ?? "Lokasi belum terdeteksi"}
              </p>
            )}
          </div>
          <button type="button" data-skip-enter onClick={refreshGeo}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-card text-xs hover:bg-accent">
            <RefreshCw className="h-3.5 w-3.5" /> Perbarui
          </button>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-10 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editing ? "Perbarui Data" : "Simpan Data"}
            <span className="hidden sm:inline opacity-70 ml-1 text-xs">(Ctrl+S)</span>
          </button>
          <button type="button" onClick={reset} data-skip-enter
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 h-10 text-sm font-medium hover:bg-accent transition-colors">
            <RotateCcw className="h-4 w-4" /> Reset <span className="hidden sm:inline opacity-70 ml-1 text-xs">(Esc)</span>
          </button>
          {editing && (
            <span className="text-xs text-warning-foreground bg-warning/30 border border-warning/40 px-2 py-1 rounded">
              Mode edit aktif
            </span>
          )}
        </div>
      </form>

      <style>{`
        .input { width:100%; height:2.5rem; padding:0 .75rem; border-radius:.5rem; border:1px solid var(--color-input);
          background-color: var(--color-card); color: var(--color-card-foreground); font-size:.9rem; outline:none;
          transition: border-color .15s, box-shadow .15s; }
        textarea.input { height:auto; padding:.5rem .75rem; }
        .input:focus { border-color: var(--color-ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ring) 20%, transparent); }
        .kbd { display:inline-flex; align-items:center; justify-content:center; min-width:1.4rem; padding:0 .3rem; height:1.25rem;
          border-radius:.25rem; border:1px solid var(--color-border); background:var(--color-muted); color:var(--color-foreground);
          font-family: ui-monospace, monospace; font-size:.7rem; }
      `}</style>
    </section>
  );
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}