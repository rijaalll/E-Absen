/* === File: app/(main)/guru/absensi/page.jsx === */
'use client';
import { useState, useEffect } from 'react';
import { getAllKelas, getAbsenByKelas, getAllUsers } from '../../../../lib/api';

export default function RekapAbsensiPage() {
    const [absensi, setAbsensi] = useState({ today: {}, yesterday: {} });
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('today'); // 'today' or 'yesterday'
    const [users, setUsers] = useState({});

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. Ambil semua data pengguna (untuk mendapatkan nama siswa)
                const usersData = await getAllUsers();
                const usersMap = Object.values(usersData).reduce((acc, user) => {
                    acc[user.id] = user;
                    return acc;
                }, {});
                setUsers(usersMap);

                // 2. Ambil semua kelas
                const kelasData = await getAllKelas();
                const kelasList = Object.values(kelasData);

                const todayAbsen = {};
                const yesterdayAbsen = {};

                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                // 3. Ambil data absensi untuk setiap kelas
                for (const kelas of kelasList) {
                    try {
                        const absenData = await getAbsenByKelas(kelas.id);
                        const namaKelas = `${kelas.kelas} ${kelas.jurusan}`;
                        
                        // Inisialisasi array untuk kelas ini
                        todayAbsen[namaKelas] = [];
                        yesterdayAbsen[namaKelas] = [];

                        for (const siswaId in absenData) {
                            for (const absenId in absenData[siswaId]) {
                                const record = absenData[siswaId][absenId];
                                const recordDate = new Date(record.tahun, record.bulan - 1, record.tanggal);
                                const siswaName = usersMap[siswaId]?.nama || 'Siswa tidak ditemukan';

                                const enrichedRecord = { ...record, siswaId, siswaName };

                                if (recordDate.toDateString() === today.toDateString()) {
                                    todayAbsen[namaKelas].push(enrichedRecord);
                                } else if (recordDate.toDateString() === yesterday.toDateString()) {
                                    yesterdayAbsen[namaKelas].push(enrichedRecord);
                                }
                            }
                        }
                    } catch (e) {
                        // Jika tidak ada absensi di kelas ini, lanjutkan saja
                        if (!e.message.includes('404')) console.error(`Gagal memuat absen untuk kelas ${kelas.id}`, e);
                    }
                }
                setAbsensi({ today: todayAbsen, yesterday: yesterdayAbsen });
            } catch (error) {
                console.error('Gagal memuat data rekap', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const dataToShow = view === 'today' ? absensi.today : absensi.yesterday;

    if (loading) return <p>Memuat rekap absensi...</p>;

    return (
        <div>
            <h1 className="mb-6 text-3xl font-bold">Rekapitulasi Kehadiran</h1>
            <div className="mb-6">
                <button onClick={() => setView('today')} className={`px-4 py-2 rounded-l-lg ${view === 'today' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Hari Ini</button>
                <button onClick={() => setView('yesterday')} className={`px-4 py-2 rounded-r-lg ${view === 'yesterday' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Kemarin</button>
            </div>

            {Object.keys(dataToShow).length === 0 ? (
                <p>Tidak ada data kehadiran untuk {view === 'today' ? 'hari ini' : 'kemarin'}.</p>
            ) : (
                Object.entries(dataToShow).map(([namaKelas, records]) => {
                    if (records.length === 0) return null;
                    return (
                        <div key={namaKelas} className="mb-8">
                            <h2 className="mb-4 text-xl font-semibold">{namaKelas}</h2>
                            <div className="overflow-x-auto bg-white rounded-lg shadow">
                                <table className="min-w-full">
                                    <thead className="bg-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">Nama Siswa</th>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">Jam Masuk</th>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {records.map(absen => (
                                            <tr key={absen.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{absen.siswaName}</td>
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
                    )
                })
            )}
        </div>
    );
}
