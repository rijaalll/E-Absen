'use client';
import { useState, useEffect } from 'react';
import { getAbsenBySiswa } from '../../../../lib/api';
import { useAuth } from '../../../../hooks/useAuth';

export default function RiwayatPage() {
    const [absensi, setAbsensi] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const fetchRiwayat = async () => {
            try {
                const data = await getAbsenBySiswa(user.id);
                
                const flattenedData = [];
                for (const kelasId in data) {
                    for (const absenId in data[kelasId]) {
                        flattenedData.push(data[kelasId][absenId]);
                    }
                }
                
                // Urutkan berdasarkan tanggal terbaru
                flattenedData.sort((a, b) => new Date(b.tahun, b.bulan - 1, b.tanggal) - new Date(a.tahun, a.bulan - 1, a.tanggal));

                const groupedByMonth = flattenedData.reduce((acc, curr) => {
                    const monthYear = new Date(curr.tahun, curr.bulan - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                    if (!acc[monthYear]) {
                        acc[monthYear] = [];
                    }
                    acc[monthYear].push(curr);
                    return acc;
                }, {});

                setAbsensi(groupedByMonth);
            } catch (err) {
                if(!err.message.includes('404')) {
                    setError('Gagal memuat riwayat absensi.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchRiwayat();
    }, [user]);

    if (loading) return <p>Memuat riwayat...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h1 className="mb-6 text-3xl font-bold">Riwayat Kehadiran</h1>
            {Object.keys(absensi).length === 0 ? (
                <p>Belum ada riwayat kehadiran.</p>
            ) : (
                Object.entries(absensi).map(([monthYear, records]) => (
                    <div key={monthYear} className="mb-8">
                        <h2 className="mb-4 text-xl font-semibold">{monthYear}</h2>
                        <div className="overflow-x-auto bg-white rounded-lg shadow">
                            <table className="min-w-full">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">Tanggal</th>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">Jam Masuk</th>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {records.map(absen => (
                                        <tr key={absen.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{`${absen.tanggal}/${absen.bulan}/${absen.tahun}`}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{`${String(absen.jam).padStart(2, '0')}:${String(absen.menit).padStart(2, '0')}`}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full">
                                                    {absen.keterangan}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

