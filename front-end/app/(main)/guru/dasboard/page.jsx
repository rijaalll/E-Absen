/* === File: app/(main)/guru/dashboard/page.jsx === */
'use client';
import { useState } from 'react';
import { generateQrCode } from '../../../../lib/api';
import QRCode from "qrcode.react";
import Link from 'next/link';

export default function GuruDashboard() {
    const [qrCode, setQrCode] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleGenerateQr = async () => {
        setLoading(true);
        try {
            const data = await generateQrCode();
            setQrCode(data.code);
            setShowQrModal(true);
        } catch (error) {
            alert('Gagal membuat QR Code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="mb-6 text-3xl font-bold">Dasbor Guru</h1>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Tombol Generate QR */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h2 className="mb-4 text-xl font-semibold">Absensi</h2>
                    <p className="mb-4 text-gray-600">Buat QR Code agar siswa bisa melakukan absensi hari ini.</p>
                    <button
                        onClick={handleGenerateQr}
                        disabled={loading}
                        className="w-full px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700 disabled:bg-green-300"
                    >
                        {loading ? 'Membuat...' : 'Generate QR Code'}
                    </button>
                </div>

                {/* Link Manajemen Siswa */}
                <Link href="/guru/siswa">
                    <div className="block p-6 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-50">
                        <h2 className="mb-4 text-xl font-semibold">Manajemen Siswa</h2>
                        <p className="text-gray-600">Lihat, tambah, edit, dan hapus data siswa.</p>
                    </div>
                </Link>

                {/* Link Rekap Absensi */}
                <Link href="/guru/absensi">
                    <div className="block p-6 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-50">
                        <h2 className="mb-4 text-xl font-semibold">Rekap Absensi</h2>
                        <p className="text-gray-600">Lihat rekapitulasi kehadiran seluruh siswa.</p>
                    </div>
                </Link>
            </div>

            {/* Modal untuk menampilkan QR Code */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="p-8 text-center bg-white rounded-lg shadow-xl">
                        <h3 className="mb-4 text-xl font-bold">Scan untuk Absen</h3>
                        <p className="mb-2 text-sm text-gray-500">Kode ini berlaku selama 5 menit.</p>
                        <div className="flex justify-center p-4 border border-gray-200 rounded-md">
                            <QRCode value={qrCode} size={256} />
                        </div>
                        <p className="mt-4 font-mono text-lg">{qrCode}</p>
                        <button onClick={() => setShowQrModal(false)} className="w-full px-4 py-2 mt-6 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
