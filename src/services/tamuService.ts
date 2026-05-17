import { supabase } from '../lib/supabase';

export interface Tamu {
  id: string;
  tanggal: string; // yyyy-mm-dd
  jam: string; // HH:mm
  namaTamu: string;
  asalInstansi: string;
  alamat: string;
  keperluan: string;
  createdAt: string;
}

export async function fetchTamu(): Promise<Tamu[]> {
  const { data, error } = await supabase
    .from('tamu')
    .select('*')
    .order('tanggal', { ascending: false });

  if (error) throw error;

  return data.map((item: any) => ({
    id: item.id,
    tanggal: item.tanggal,
    jam: item.jam,
    namaTamu: item.nama_tamu,
    asalInstansi: item.asal_instansi,
    alamat: item.alamat,
    keperluan: item.keperluan,
    createdAt: item.created_at,
  }));
}

export async function addTamu(tamu: Omit<Tamu, 'id' | 'createdAt' | 'tanggal' | 'jam'>) {
  const { data, error } = await supabase.from('tamu').insert([{
    nama_tamu: tamu.namaTamu,
    asal_instansi: tamu.asalInstansi,
    alamat: tamu.alamat,
    keperluan: tamu.keperluan
  }]);

  if (error) throw error;
  return data;
}