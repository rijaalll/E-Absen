'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { qrAPI, absenAPI } from '../../../utils/api';

export default function SiswaPage() {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [absenToday, setAbsenToday] = useState(null);
  const [absenHistory, setAbsenHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'siswa') {
      router.push('/');
      return;
    }
    
    checkTodayAttendance();
    loadAbsenHistory();
  }, [isAuthenticated, user, router]);

  const checkTodayAttendance = async () => {
    try {
      const today = new Date();
      const response = await absenAPI.getBySiswa(user.id, {
        kelas: user.detail.kelas
      });
      
      const todayKey = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const todayAbsen = response.data.absen[todayKey];
      
      setAbsenToday(todayAbsen ? Object.values(todayAbsen)[0] : null);
    } catch (error) {
      console.error('Error checking today attendance:', error);
    }
  };

  const loadAbsenHistory = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const response = await absenAPI.getBySiswa(user.id, {
        kelas: user.detail.kelas,
        bulan: currentMonth,
        tahun: currentYear
      });
      
      const history = [];
      const absenData = response.data.absen;
      
      if (absenData) {
        Object.entries(absenData).forEach(([dateKey, dayData]) => {
          Object.values(dayData).forEach(absen => {
            history.push(absen);
          });
        });
      }
      
      history.sort((a, b) => new Date(a.tahun, a.bulan - 1, a.tanggal) - new Date(b.tahun, b.bulan - 1, b.tanggal));
      setAbsenHistory(history);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
  };

  const startScanning = () => {
    if (absenToday) {
      setMessage('Anda sudah melakukan absen hari ini!');
      return;
    }

    setIsScanning(true);
    setMessage('');
    
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);
  };

  const onScanSuccess = async (decodedText) => {
    setIsScanning(false);
    setScanResult(decodedText);
    setLoading(true);

    try {
      const response = await qrAPI.verify({
        id: decodedText,
        id_siswa: user.id
      });

      if (response.data.valid) {
        setMessage('Absen berhasil dicatat!');
        checkTodayAttendance();
        loadAbsenHistory();
      } else {
        setMessage('QR Code tidak valid atau sudah kadaluarsa');
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Gagal memverifikasi QR Code');
    } finally {
      setLoading(false);
      // Clear the scanner
      const scannerElement = document.getElementById('qr-reader');
      if (scannerElement) {
        scannerElement.innerHTML = '';
      }
    }
  };

  const onScanFailure = (error) => {
    // Handle scan failure silently
  };

  const stopScanning = () => {
    setIsScanning(false);
    const scannerElement = document.getElementById('qr-reader');
    if (scannerElement) {
      scannerElement.innerHTML = '';
    }
  };

  const formatTime = (jam, menit) => {
    return `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;
  };

  const formatDate = (tanggal, bulan, tahun) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${tanggal} ${months[bulan - 1]} ${tahun}`;
  };

  if (!isAuthenticated || user?.role !== 'siswa') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Siswa</h1>
              <p className="text-sm text-gray-600">
                Selamat datang, {user?.nama} - {user?.detail?.kelas} {user?.detail?.jurusan}
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('scan')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'scan'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Scan Absen
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Riwayat Absen
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'scan' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Scan QR Code Absen</h2>
              
              {absenToday ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  <p className="font-semibold">Kamu sudah absen hari ini!</p>
                  <p className="text-sm">
                    Waktu: {formatTime(absenToday.jam, absenToday.menit)} - 
                    Tanggal: {formatDate(absenToday.tanggal, absenToday.bulan, absenToday.tahun)}
                  </p>
                </div>
              ) : (
                <div>
                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
                    >
                      Mulai Scan QR Code
                    </button>
                  ) : (
                    <div>
                      <div id="qr-reader" className="mb-4"></div>
                      <button
                        onClick={stopScanning}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                      >
                        Berhenti Scan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className={`mt-4 p-4 rounded ${
                  message.includes('berhasil') 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              {loading && (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Memverifikasi QR Code...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Riwayat Absen Bulan Ini
              </h2>
              
              {absenHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Belum ada data absen bulan ini</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Waktu
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {absenHistory.map((absen, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(absen.tanggal, absen.bulan, absen.tahun)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(absen.jam, absen.menit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {absen.keterangan}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}