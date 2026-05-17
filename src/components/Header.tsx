import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { formatJam, formatTanggalLengkapID } from "@/utils/dateUtils";
import { Moon, Sun, Building2, Home, History, BarChart3 } from "lucide-react";

export function Header() {
  const now = useRealtimeClock();
  
  // 1. State awal yang seragam untuk Server & Client
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 2. Baca localStorage HANYA setelah komponen di-mount di Client
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("wl-theme");
    const initial = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(initial);
  }, []);

  // 3. Terapkan kelas tema ke HTML
  useEffect(() => {
    if (!mounted) return; // Jangan terapkan apa pun saat SSR
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("wl-theme", dark ? "dark" : "light");
  }, [dark, mounted]);

  const navItem =
    "inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border border-transparent hover:bg-header-foreground/10 transition-colors";
  const navActive = "bg-header-foreground/15 border-header-foreground/20 font-medium";

  return (
    <header className="bg-header text-header-foreground border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-md bg-header-foreground/10 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              SIPADU
            </h1>
            <p className="text-xs text-header-foreground/70 truncate">
              Sistem Informasi Pelayanan dan Buku Tamu Terpadu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right leading-tight mr-2">
            <div suppressHydrationWarning className="font-mono text-xl sm:text-2xl tabular-nums">
              {formatJam(now)}
            </div>
            <div suppressHydrationWarning className="text-xs text-header-foreground/70">
              {formatTanggalLengkapID(now)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDark((v) => !v)}
            aria-label="Toggle dark mode"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-header-foreground/15 hover:bg-header-foreground/10 transition-colors"
          >
            {/* Render Ikon yang sesuai hanya setelah di-mount agar tidak bentrok dengan server */}
            {mounted && dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className="border-t border-header-foreground/10 px-2 sm:px-6 max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto">
        <Link to="/" activeOptions={{ exact: true }} className={navItem} activeProps={{ className: `${navItem} ${navActive}` }}>
          <Home className="h-4 w-4" /> Beranda
        </Link>
        <Link to="/history" className={navItem} activeProps={{ className: `${navItem} ${navActive}` }}>
          <History className="h-4 w-4" /> Riwayat Harian
        </Link>
        <Link to="/dashboard" className={navItem} activeProps={{ className: `${navItem} ${navActive}` }}>
          <BarChart3 className="h-4 w-4" /> Dashboard
        </Link>
        <div suppressHydrationWarning className="ml-auto sm:hidden text-xs py-2 pr-2 text-header-foreground/70 font-mono tabular-nums">
          {formatJam(now)}
        </div>
      </nav>
    </header>
  );
}