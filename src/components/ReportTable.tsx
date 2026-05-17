import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import type { Laporan } from "@/services/laporanService";
import { formatTanggalID } from "@/utils/dateUtils";
import { Search, Download, Trash2, Pencil, Inbox, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

interface Props {
  data: Laporan[];
  onEdit: (l: Laporan) => void;
  onDelete: (id: string) => void;
  title?: string;
}

const PAGE_SIZE = 10;

export function ReportTable({ data, onEdit, onDelete, title = "Data Wajib Lapor" }: Props) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((d) =>
      [d.namaKlien, d.statusProgram, d.pasal, d.pembimbing, d.asalInstansi, d.alamat]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [data, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }
    const rows = filtered.map((d, i) => ({
      No: i + 1,
      "Nama Klien": d.namaKlien,
      "Tanggal Lahir": formatTanggalID(d.tanggalLahir),
      "Jenis Kelamin": d.jenisKelamin,
      Alamat: d.alamat,
      "Status Program": d.statusProgram,
      "Pasal/Perkara": d.pasal,
      "Asal Instansi": d.asalInstansi,
      "Tanggal Lapor": formatTanggalID(d.tanggalLapor),
      "Tanggal Kembali": formatTanggalID(d.tanggalKembali),
      "Pembimbing Kemasyarakatan": d.pembimbing,
      Latitude: d.geotag?.latitude ?? "",
      Longitude: d.geotag?.longitude ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wajib Lapor");
    const fname = `wajib-lapor-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success("Data berhasil diexport ke Excel");
  };

  return (
    <section className="bg-card text-card-foreground rounded-xl border border-border shadow-card">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Total {data.length} entri{q && ` · ${filtered.length} hasil pencarian`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Cari nama, pasal, pembimbing..."
              className="h-10 pl-9 pr-3 rounded-md border border-input bg-card text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
            />
          </div>
          <button onClick={exportExcel}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent transition-colors">
            <Download className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <Th className="w-12 text-center">No</Th>
              <Th>Nama Klien</Th>
              <Th className="w-24">Status</Th>
              <Th>Pasal/Perkara</Th>
              <Th className="w-36">Tanggal Lapor</Th>
              <Th className="w-36">Tanggal Kembali</Th>
              <Th>Pembimbing</Th>
              <Th className="w-20">Geotag</Th>
              <Th className="w-28 text-center">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-50" />
                    <p className="text-sm">{q ? "Tidak ada data yang cocok dengan pencarian." : "Belum ada data wajib lapor."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((d, i) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/40">
                  <Td className="text-center text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td className="font-medium">{d.namaKlien}</Td>
                  <Td><StatusBadge status={d.statusProgram} /></Td>
                  <Td>{d.pasal}</Td>
                  <Td>{formatTanggalID(d.tanggalLapor)}</Td>
                  <Td>{formatTanggalID(d.tanggalKembali)}</Td>
                  <Td>{d.pembimbing}</Td>
                  <Td>
                    {d.geotag ? (
                      <a
                        href={`https://www.google.com/maps?q=${d.geotag.latitude},${d.geotag.longitude}`}
                        target="_blank" rel="noreferrer"
                        title={`${d.geotag.latitude.toFixed(5)}, ${d.geotag.longitude.toFixed(5)}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" /> Lihat
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onEdit(d)} title="Edit"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmId(d.id)} title="Hapus"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {safePage} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-accent">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmId(null)}>
          <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevated max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Hapus data?</h3>
            <p className="text-sm text-muted-foreground mt-1">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)}
                className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent">Batal</button>
              <button onClick={() => { onDelete(confirmId); setConfirmId(null); toast.success("Data berhasil dihapus"); }}
                className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm hover:opacity-90">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 align-middle ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: "PB" | "CB" }) {
  const cls =
    status === "PB"
      ? "bg-primary/10 text-primary border-primary/30"
      : "bg-warning/20 text-warning-foreground border-warning/40";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
