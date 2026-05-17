import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { fetchLaporan, type Laporan, getKategori } from "@/services/laporanService";
import { fetchTamu, type Tamu } from "@/services/tamuService";
import { toISODate } from "@/utils/dateUtils";
import { UserPlus, Baby, UserCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Beranda,
  head: () => ({
    meta: [
      { title: "SIPADU — Sistem Informasi Pelayanan dan Buku Tamu Terpadu" },
      {
        name: "description",
        content:
          "SIPADU: aplikasi pelayanan administrasi terpadu — wajib lapor anak, dewasa, dan buku tamu.",
      },
    ],
  }),
});

function Beranda() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [tamu, setTamu] = useState<Tamu[]>([]);
  const today = toISODate(new Date());

  useEffect(() => {
    fetchLaporan().then(setLaporan).catch(console.error);
    fetchTamu().then(setTamu).catch(console.error);
  }, []);

  const totalDewasa = laporan.filter((l) => getKategori(l) === "dewasa").length;
  const totalAnak = laporan.filter((l) => getKategori(l) === "anak").length;
  const tamuHariIni = tamu.filter((t) => t.tanggal === today).length;

  const menus = [
    {
      to: "/tamu" as const,
      title: "Buku Tamu",
      hint: `${tamuHariIni} tamu hari ini`,
      icon: <UserCheck className="h-10 w-10" />,
      cardClass:
        "border-emerald-900/60 hover:border-emerald-700/60 bg-[#0d1f18]",
      iconClass: "bg-[#0a1f14] text-emerald-400",
      hintClass: "text-emerald-400",
      arrowClass: "bg-[#0a1f14] text-emerald-400",
      glowClass: "from-emerald-500/5 to-transparent",
    },
    {
      to: "/lapor/anak" as const,
      title: "Wajib Lapor Anak",
      hint: `${totalAnak} klien terdaftar`,
      icon: <Baby className="h-10 w-10" />,
      cardClass: "border-amber-900/60 hover:border-amber-700/60 bg-[#1f1608]",
      iconClass: "bg-[#1a1005] text-amber-400",
      hintClass: "text-amber-400",
      arrowClass: "bg-[#1a1005] text-amber-400",
      glowClass: "from-amber-500/5 to-transparent",
    },
    {
      to: "/lapor/dewasa" as const,
      title: "Wajib Lapor Dewasa",
      hint: `${totalDewasa} klien terdaftar`,
      icon: <UserPlus className="h-10 w-10" />,
      cardClass: "border-blue-900/60 hover:border-blue-700/60 bg-[#0d1a2a]",
      iconClass: "bg-[#091525] text-blue-400",
      hintClass: "text-blue-400",
      arrowClass: "bg-[#091525] text-blue-400",
      glowClass: "from-blue-500/5 to-transparent",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <Toaster position="top-right" richColors closeButton />
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-14">
        {/* Page heading */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            Pilih Layanan
          </h2>
          <p className="text-sm text-[#8b949e] mt-2">
            Silakan pilih menu layanan terlebih dahulu sebelum melakukan input
            data.
          </p>
        </div>

        {/* Menu cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
          {menus.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className={`
                group relative overflow-hidden rounded-2xl border
                transition-all duration-200 hover:-translate-y-1
                flex flex-col items-center text-center p-10 gap-0
                ${m.cardClass}
              `}
            >
              {/* Subtle top glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${m.glowClass} pointer-events-none`}
              />

              {/* Icon circle */}
              <div
                className={`
                  relative z-10 h-[90px] w-[90px] rounded-full
                  inline-flex items-center justify-center mb-7
                  ${m.iconClass}
                `}
              >
                {m.icon}
              </div>

              {/* Title */}
              <h3 className="relative z-10 text-xl font-semibold text-[#e6edf3] mb-5">
                {m.title}
              </h3>

              {/* Hint */}
              <p className={`relative z-10 text-sm font-medium mb-7 ${m.hintClass}`}>
                {m.hint}
              </p>

              {/* Arrow button */}
              <div
                className={`
                  relative z-10 h-11 w-11 rounded-full
                  inline-flex items-center justify-center
                  transition-transform duration-150
                  group-hover:translate-x-1
                  ${m.arrowClass}
                `}
              >
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-8 w-full max-w-5xl rounded-xl border border-[#21262d] bg-[#161b22] px-5 py-4 flex gap-3 items-start">
          <span className="text-[#8b949e] text-base mt-0.5">💡</span>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            <span className="font-semibold text-[#c9d1d9]">Tips:</span> setelah
            menyimpan data, sistem akan otomatis kembali ke halaman ini. Anda
            dapat melihat riwayat di menu{" "}
            <span className="font-medium text-[#c9d1d9]">Riwayat Harian</span>{" "}
            dan statistik pada{" "}
            <span className="font-medium text-[#c9d1d9]">Dashboard</span>.
          </p>
        </div>
      </main>

      <footer className="border-t border-[#21262d] py-3 text-center text-xs text-[#484f58]">
        SIPADU - Sistem Informasi Pelayanan dan Buku Tamu Terpadu - v2.0
      </footer>
    </div>
  );
}