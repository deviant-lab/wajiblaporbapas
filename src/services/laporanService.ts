import { supabase } from '../lib/supabase';

export type JenisKelamin = "Laki-laki" | "Perempuan";
export type StatusProgram = "PB" | "CB";
export type KategoriLapor = "anak" | "dewasa";

export interface Geotag {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export interface Laporan {
  id: string;
  kategori: KategoriLapor;
  namaKlien: string;
  tanggalLahir: string; 
  jenisKelamin: JenisKelamin;
  alamat: string;
  statusProgram: StatusProgram;
  pasal: string;
  asalInstansi: string;
  tanggalLapor: string; 
  tanggalKembali: string; 
  pembimbing: string;
  geotag?: Geotag | null;
  createdAt: string;
}

export async function fetchLaporan(): Promise<Laporan[]> {
  const { data, error } = await supabase
    .from('laporan')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((item: any) => ({
    id: item.id,
    kategori: item.kategori,
    namaKlien: item.nama_klien,
    tanggalLahir: item.tanggal_lahir,
    jenisKelamin: item.jenis_kelamin,
    alamat: item.alamat,
    statusProgram: item.status_program,
    pasal: item.pasal,
    asalInstansi: item.asal_instansi,
    tanggalLapor: item.tanggal_lapor,
    tanggalKembali: item.tanggal_kembali,
    pembimbing: item.pembimbing,
    geotag: item.latitude ? { latitude: item.latitude, longitude: item.longitude, capturedAt: item.geo_captured_at } : null,
    createdAt: item.created_at,
  }));
}

export async function addLaporan(laporan: Omit<Laporan, 'id' | 'createdAt'>) {
  const { data, error } = await supabase.from('laporan').insert([{
    kategori: laporan.kategori,
    nama_klien: laporan.namaKlien,
    tanggal_lahir: laporan.tanggalLahir,
    jenis_kelamin: laporan.jenisKelamin,
    alamat: laporan.alamat,
    status_program: laporan.statusProgram,
    pasal: laporan.pasal,
    asal_instansi: laporan.asalInstansi,
    tanggal_lapor: laporan.tanggalLapor,
    tanggal_kembali: laporan.tanggalKembali,
    pembimbing: laporan.pembimbing,
    latitude: laporan.geotag?.latitude,
    longitude: laporan.geotag?.longitude,
    geo_accuracy: laporan.geotag?.accuracy,
    geo_captured_at: laporan.geotag?.capturedAt
  }]).select(); // WAJIB ada .select() agar mengembalikan ID yang baru di-generate

  if (error) throw error;
  return data;
}

export function getKategori(l: Laporan): KategoriLapor {
  return (l.kategori as KategoriLapor) ?? "dewasa";
}