/* === File: app/(main)/siswa/dashboard/page.jsx === */
'use client';
import { useState, useEffect } from 'react';
import QrScanner from '../../../../components/QrScanner';
import { getAbsenBySiswa, scanQrCode } from '../../../../lib/api';
import { useAuth } from '../../../../hooks/useAuth';

export default function SiswaDashboard() {
  const [showScanner, setShowScanner] = useState(false);
  const [sudahHadir, setSudahHadir] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const cekKehadiranHariIni = async () => {
      if (!user) return;
      try {
        const data = await getAbsenBySiswa(user.id);
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth() + 1;
        const todayYear = today.getFullYear();
        
        let hadir = false;
        // Data absensi berbentuk { id_kelas: { id_absen: {...} } }
        for (const kelasId in data) {
          for (const absenId in data[kelasId]) {
            const absen = data[kelasId][absenId];
            if (absen.tanggal === todayDate && absen.bulan === todayMonth && absen.tahun === todayYear) {
              hadir = true;
              break;
            }
          }
          if (hadir) break;
        }
        setSudahHadir(hadir);
      } catch (err) {
        // Jika 404 (belum ada data absen sama sekali), anggap belum hadir
        if (err.message.includes('404')) {
            setSudahHadir(false);
        } else {
            setError('Gagal memeriksa status kehadiran.');
        }
      } finally {
        setLoading(false);
      }
    };

    cekKehadiranHariIni();
  }, [user]);

  const handleScanSuccess = async (qrCode) => {
      try {
          const result = await scanQrCode({ qrCode });
          alert(result.message); // Tampilkan notifikasi
          setShowScanner(false);
          setSudahHadir(true); // Langsung update status
      } catch (err) {
          alert(`Error: ${err.message}`);
      }
  };

  if (loading) return <p>Mengecek status kehadiran...</p>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Dasbor Siswa</h1>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold">Selamat Datang, {user?.nama}!</h2>
        {error && <p className="mt-4 text-red-500">{error}</p>}
        
        {sudahHadir ? (
          <p className="mt-4 text-lg text-green-600">Anda sudah tercatat hadir hari ini.</p>
        ) : (
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2 mt-4 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
          >
            Scan QR Absensi
          </button>
        )}
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg">
            <h3 className="mb-4 text-lg font-bold">Arahkan Kamera ke QR Code</h3>
            <QrScanner onScanSuccess={handleScanSuccess} />
            <button onClick={() => setShowScanner(false)} className="w-full px-4 py-2 mt-4 text-white bg-red-500 rounded">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

