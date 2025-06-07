'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { qrAPI, absenAPI } from '../../utils/api';

export default function SiswaPage() {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [absenToday, setAbsenToday] = useState(null);
  const [absenHistory, setAbsenHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const qrScannerRef = useRef(null);
  const scannerStateRef = useRef({ isProcessing: false });
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  // Memoized functions to prevent unnecessary re-renders
  const checkTodayAttendance = useCallback(async () => {
    if (!user?.id || !user?.detail?.kelas) return;

    try {
      const today = new Date();
      const response = await absenAPI.getBySiswa(user.id, {
        kelas: user.detail.kelas,
      });

      const todayKey = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const todayAbsen = response.data.absen?.[todayKey];

      setAbsenToday(todayAbsen ? Object.values(todayAbsen)[0] : null);
    } catch (error) {
      console.error('Error checking today attendance:', error);
      setError('Gagal mengecek absen hari ini');
    }
  }, [user?.id, user?.detail?.kelas]);

  const loadAbsenHistory = useCallback(async () => {
    if (!user?.id || !user?.detail?.kelas) return;

    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const response = await absenAPI.getBySiswa(user.id, {
        kelas: user.detail.kelas,
        bulan: currentMonth,
        tahun: currentYear,
      });

      const history = [];
      const absenData = response.data.absen;

      if (absenData) {
        Object.entries(absenData).forEach(([dateKey, dayData]) => {
          if (dayData && typeof dayData === 'object') {
            Object.values(dayData).forEach((absen) => {
              if (absen && typeof absen === 'object') {
                history.push(absen);
              }
            });
          }
        });
      }

      // Sort by date (newest first)
      history.sort((a, b) => {
        const dateA = new Date(a.tahun, a.bulan - 1, a.tanggal);
        const dateB = new Date(b.tahun, b.bulan - 1, b.tanggal);
        return dateB - dateA;
      });

      setAbsenHistory(history);
    } catch (error) {
      console.error('Error loading attendance history:', error);
      setError('Gagal memuat riwayat absen');
    }
  }, [user?.id, user?.detail?.kelas]);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'siswa') {
      router.push('/');
      return;
    }

    checkTodayAttendance();
    loadAbsenHistory();
  }, [isAuthenticated, user?.role, router, checkTodayAttendance, loadAbsenHistory]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (qrScannerRef.current) {
          try {
            const state = qrScannerRef.current.getState();
            
            if (state === Html5QrcodeScannerState.SCANNING || 
                state === Html5QrcodeScannerState.PAUSED) {
              await qrScannerRef.current.stop();
            }
            
            await qrScannerRef.current.clear();
          } catch (err) {
            // Silent cleanup pada unmount
            console.warn('Cleanup on unmount:', err.message);
          }
        }
      };
      
      cleanup();
    };
  }, []);

  const cleanupScanner = async () => {
    if (qrScannerRef.current) {
      try {
        // Cek apakah scanner sedang berjalan sebelum stop
        const state = qrScannerRef.current.getState();
        
        if (state === Html5QrcodeScannerState.SCANNING || 
            state === Html5QrcodeScannerState.PAUSED) {
          console.log('🛑 Stopping active scanner...');
          await qrScannerRef.current.stop();
        } else {
          console.log('📷 Scanner already stopped, state:', state);
        }

        // Clear scanner element
        await qrScannerRef.current.clear();
        console.log('🧹 Scanner cleared successfully');
        
      } catch (err) {
        // Log lebih detail untuk debugging
        console.warn('⚠️ Scanner cleanup warning:', {
          error: err.message,
          scanner: qrScannerRef.current ? 'exists' : 'null'
        });
        
        // Jika error karena scanner sudah stopped, abaikan
        if (!err.message.includes('not running') && 
            !err.message.includes('not started')) {
          console.error('❌ Unexpected scanner error:', err);
        }
      }
      
      qrScannerRef.current = null;
    }
  };

  const startScanning = async () => {
    if (absenToday) {
      setMessage('Anda sudah melakukan absen hari ini!');
      return;
    }

    setMessage('');
    setError('');
    setIsScanning(true);
    scannerStateRef.current.isProcessing = false;

    // Small delay to ensure DOM element is rendered
    setTimeout(async () => {
      const qrCodeRegionId = 'qr-reader';
      const qrElement = document.getElementById(qrCodeRegionId);

      if (!qrElement) {
        console.error('QR reader element not found in DOM');
        setError('Gagal memulai scanner. Coba lagi.');
        setIsScanning(false);
        return;
      }

      try {
        qrScannerRef.current = new Html5Qrcode(qrCodeRegionId);

        await qrScannerRef.current.start(
          { facingMode: 'environment' },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          handleScanSuccess,
          handleScanFailure
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
        setError(`Tidak dapat mengakses kamera: ${err.message}`);
        setIsScanning(false);
        await cleanupScanner();
      }
    }, 300);
  };

  const stopScanning = async () => {
    setIsScanning(false);
    scannerStateRef.current.isProcessing = false;
    await cleanupScanner();
  };

  const handleScanSuccess = async (decodedText, decodedResult) => {
    // Prevent multiple simultaneous processing of the same QR
    if (scannerStateRef.current.isProcessing) {
      console.log('Already processing a QR code, skipping...');
      return;
    }

    // Set processing flag immediately
    scannerStateRef.current.isProcessing = true;
    
    console.log('🔍 QR Code detected:', decodedText);
    console.log('🚀 Starting automatic verification...');

    setScanResult(decodedText);
    setLoading(true);
    setMessage('');
    setError('');

    // Stop scanner safely - cek state dulu
    try {
      if (qrScannerRef.current) {
        const state = qrScannerRef.current.getState();
        
        if (state === Html5QrcodeScannerState.SCANNING) {
          await qrScannerRef.current.stop();
          console.log('📷 Scanner stopped after QR detection');
        }
      }
      setIsScanning(false);
    } catch (err) {
      console.warn('⚠️ Scanner stop warning:', err.message);
      setIsScanning(false);
    }

    try {
      console.log('🔐 Verifying QR Code with API...');
      
      const response = await qrAPI.verify({
        id: decodedText,
        id_siswa: user.id,
      });

      console.log('📋 API Response:', response);

      if (response.data.valid) {
        console.log('✅ QR Code valid - Attendance recorded');
        setMessage('🎉 Absen berhasil dicatat!');
        
        // Refresh data to show updated attendance
        console.log('🔄 Refreshing attendance data...');
        await Promise.all([
          checkTodayAttendance(),
          loadAbsenHistory()
        ]);
        console.log('✨ Data refreshed successfully');
      } else {
        console.log('❌ QR Code invalid or expired');
        setError('QR Code tidak valid atau sudah kadaluarsa');
      }
    } catch (error) {
      console.error('❌ QR verification error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Gagal memverifikasi QR Code';
      setError(`Verifikasi gagal: ${errorMessage}`);
    } finally {
      setLoading(false);
      await cleanupScanner();
      scannerStateRef.current.isProcessing = false;
      console.log('🏁 Verification process completed');
    }
  };

  const handleScanFailure = (error) => {
    // Only log significant errors, not continuous scan failures
    if (error && !error.includes('NotFoundException')) {
      console.warn('QR scan error:', error);
    }
  };

  const formatTime = (jam, menit) => {
    const hour = parseInt(jam) || 0;
    const minute = parseInt(menit) || 0;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const formatDate = (tanggal, bulan, tahun) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const day = parseInt(tanggal) || 1;
    const month = parseInt(bulan) || 1;
    const year = parseInt(tahun) || new Date().getFullYear();
    
    return `${day} ${months[month - 1] || months[0]} ${year}`;
  };

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  // Loading state for authentication check
  if (!isAuthenticated || user?.role !== 'siswa') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
              onClick={() => {
                setActiveTab('scan');
                clearMessages();
              }}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'scan'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Scan Absen
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                clearMessages();
                if (isScanning) {
                  stopScanning();
                }
              }}
              className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Riwayat Absen
            </button>
          </nav>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          </div>
        )}

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
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
                    >
                      {loading ? 'Memproses...' : 'Mulai Scan QR Code'}
                    </button>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
                        <p className="text-sm text-gray-600 text-center mt-2">
                          📱 Arahkan kamera ke QR Code<br/>
                          <span className="text-xs text-green-600">Verifikasi akan berjalan otomatis saat QR terdeteksi</span>
                        </p>
                      </div>
                      <button
                        onClick={stopScanning}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                      >
                        Berhenti Scan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  <div className="flex justify-between items-center">
                    <span>{message}</span>
                    <button
                      onClick={() => setMessage('')}
                      className="text-green-700 hover:text-green-900"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-600">
                    🔐 Memverifikasi QR Code secara otomatis...
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Proses verifikasi berjalan otomatis setelah QR terdeteksi
                  </p>
                </div>
              )}

              {scanResult && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                  <strong>Hasil Scan:</strong> {scanResult}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Riwayat Absen Bulan Ini</h2>
                <button
                  onClick={() => {
                    loadAbsenHistory();
                    setMessage('Data berhasil diperbarui');
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Refresh
                </button>
              </div>

              {absenHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada data absen bulan ini</p>
                  <button
                    onClick={loadAbsenHistory}
                    className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    Muat ulang data
                  </button>
                </div>
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
                        <tr key={`${absen.tanggal}-${absen.bulan}-${absen.tahun}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(absen.tanggal, absen.bulan, absen.tahun)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(absen.jam, absen.menit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {absen.keterangan || 'Hadir'}
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