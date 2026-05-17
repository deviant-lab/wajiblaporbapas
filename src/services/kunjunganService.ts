import { supabase } from '../lib/supabase';

export interface Kunjungan {
  id: string;
  laporanId: string;
  namaKlien: string;
  statusProgram: "PB" | "CB";
  tanggal: string; // yyyy-mm-dd
  jam: string; // HH:mm
  petugas: string;
  catatan?: string;
  createdAt: string;
}

export async function fetchKunjungan(): Promise<Kunjungan[]> {
  const { data, error } = await supabase
    .from('kunjungan')
    .select('*, laporan(nama_klien, status_program)')
    .order('tanggal', { ascending: false });

  if (error) throw error;

  return data.map((item: any) => ({
    id: item.id,
    laporanId: item.laporan_id,
    namaKlien: item.laporan?.nama_klien,
    statusProgram: item.laporan?.status_program,
    tanggal: item.tanggal,
    jam: item.jam,
    petugas: item.petugas,
    catatan: item.catatan,
    createdAt: item.created_at,
  }));
}

export async function addKunjungan(kunjungan: Omit<Kunjungan, 'id' | 'createdAt' | 'namaKlien' | 'statusProgram'>) {
  const { data, error } = await supabase.from('kunjungan').insert([{
    laporan_id: kunjungan.laporanId,
    tanggal: kunjungan.tanggal,
    jam: kunjungan.jam,
    petugas: kunjungan.petugas,
    catatan: kunjungan.catatan
  }]);

  if (error) throw error;
  return data;
}