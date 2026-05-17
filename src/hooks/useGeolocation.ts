import { useCallback, useEffect, useState } from "react";
import type { Geotag } from "@/services/laporanService";

interface GeoState {
  geotag: Geotag | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation(autoFetch = true) {
  const [state, setState] = useState<GeoState>({ geotag: null, loading: false, error: null });

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ geotag: null, loading: false, error: "Browser tidak mendukung geolokasi" });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          loading: false,
          error: null,
          geotag: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          },
        });
      },
      (err) => setState({ geotag: null, loading: false, error: err.message || "Gagal mengambil lokasi" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (autoFetch) refresh();
  }, [autoFetch, refresh]);

  return { ...state, refresh };
}
