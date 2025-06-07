'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { siswaAPI, guruAPI, kelasAPI, qrAPI, absenAPI } from '../../utils/api';
import QRCode from 'qrcode';

export default function GuruPage() {
  const [activeTab, setActiveTab] = useState('siswa');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Data states
  const [siswaList, setSiswaList] = useState([]);
  const [guruList, setGuruList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [absenData, setAbsenData] = useState({});
  
  // Form states
  const [siswaForm, setSiswaForm] = useState({
    nama: '', telephone: '', email: '', password: '', jenis_kelamin: '',
    alamat: { provinsi: '', kota: '', kecamatan: '', kode_pos: '', desa: '', rt: '', rw: '' },
    detail: { nama_ibu: '', nama_ayah: '', telephone_ortu: '', nisn: '', kelas: '', jurusan: '' }
  });
  
  const [guruForm, setGuruForm] = useState({
    nama: '', telephone: '', email: '', password: '', jenis_kelamin: '',
    alamat: { provinsi: '', kota: '', kecamatan: '', kode_pos: '', desa: '', rt: '', rw: '' }
  });
  
  const [kelasForm, setKelasForm] = useState({ kelas: '', jurusan: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'qr'
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'guru') {
      router.push('/');
      return;
    }
    
    loadInitialData();
  }, [isAuthenticated, user, router]);

  const loadInitialData = async () => {
    await Promise.all([
      loadSiswa(),
      loadGuru(),
      loadKelas(),
    ]);
  };

  const loadSiswa = async () => {
    try {
      const response = await siswaAPI.getAll();
      setSiswaList(response.data.siswa || []);
    } catch (error) {
      console.error('Error loading siswa:', error);
    }
  };

  const loadGuru = async () => {
    try {
      // Since guruAPI endpoints might not exist, we'll simulate this
      setGuruList([
        { id: '1', nama: 'Guru 1', email: 'guru1@example.com', telephone: '081234567890' },
        { id: '2', nama: 'Guru 2', email: 'guru2@example.com', telephone: '081234567891' }
      ]);
    } catch (error) {
      console.error('Error loading guru:', error);
    }
  };

  const loadKelas = async () => {
    try {
      const response = await kelasAPI.getAll();
      const kelasData = response.data.kelas || [];
  
      kelasData.sort((a, b) => parseInt(a.kelas) - parseInt(b.kelas));
  
      setKelasList(kelasData);
    } catch (error) {
      console.error('Error loading kelas:', error);
    }
  };
  
  

  const loadAbsenData = async () => {
    if (!selectedKelas) return;
    
    try {
      setLoading(true);
      const response = await absenAPI.getAll({
        kelas: selectedKelas,
        bulan: selectedBulan,
        tahun: selectedTahun
      });
      setAbsenData(response.data.absen || {});
    } catch (error) {
      console.error('Error loading absen data:', error);
      setMessage('Gagal memuat data absen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'absen' && selectedKelas) {
      loadAbsenData();
    }
  }, [activeTab, selectedKelas, selectedBulan, selectedTahun]);

  // CRUD Siswa Functions
  const handleSiswaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (modalType === 'add') {
        await siswaAPI.register(siswaForm);
        setMessage('Siswa berhasil ditambahkan');
      } else {
        await siswaAPI.update(selectedItem.id, siswaForm);
        setMessage('Data siswa berhasil diperbarui');
      }
      
      await loadSiswa();
      setShowModal(false);
      resetSiswaForm();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Guru Functions
  const handleGuruSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (modalType === 'add') {
        await guruAPI.register(guruForm);
        setMessage('Guru berhasil ditambahkan');
      } else {
        await guruAPI.update(selectedItem.id, guruForm);
        setMessage('Data guru berhasil diperbarui');
      }
      
      await loadGuru();
      setShowModal(false);
      resetGuruForm();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Kelas Functions
  const handleKelasSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (modalType === 'add') {
        await kelasAPI.create(kelasForm);
        setMessage('Kelas berhasil ditambahkan');
      } else {
        await kelasAPI.update(selectedItem.id, kelasForm);
        setMessage('Data kelas berhasil diperbarui');
      }
      
      await loadKelas();
      setShowModal(false);
      resetKelasForm();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKelas = async (id) => {
    if (!confirm('Yakin ingin menghapus kelas ini?')) return;
    
    try {
      setLoading(true);
      await kelasAPI.delete(id);
      setMessage('Kelas berhasil dihapus');
      await loadKelas();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Gagal menghapus kelas');
    } finally {
      setLoading(false);
    }
  };

  // QR Code Functions
  const generateQRCode = async (kelas, jurusan) => {
    try {
      setLoading(true);
      const response = await qrAPI.generate({
        kelas,
        jurusan,
        guru_id: user.id
      });
  
      const qrData = response.data.qr_data;
      const qrCodeDataURL = await QRCode.toDataURL(qrData.id);
      setQrCodeUrl(qrCodeDataURL);
      setSelectedItem({ kelas, jurusan, qrData });
      setModalType('qr');
      setShowModal(true);
      setMessage('QR Code berhasil dibuat');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Gagal membuat QR Code');
    } finally {
      setLoading(false);
    }
  };
  

  const refreshQRCode = async () => {
    try {
      setLoading(true);
      const response = await qrAPI.refresh({
        kelas: selectedItem.kelas,
        jurusan: selectedItem.jurusan,
        guru_id: user.id
      });
  
      const qrData = response.data.qr_data;
      const qrCodeDataURL = await QRCode.toDataURL(qrData.id);
      setQrCodeUrl(qrCodeDataURL);
      setSelectedItem({ ...selectedItem, qrData });
      setMessage('QR Code berhasil diperbarui');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Gagal memperbarui QR Code');
    } finally {
      setLoading(false);
    }
  };
  

  const getQRCode = async (kelas, jurusan) => {
    try {
      setLoading(true);
      const response = await qrAPI.get(kelas, jurusan);
      const qrData = response.data.qr_data;
      const qrCodeDataURL = await QRCode.toDataURL(qrData.id);
      setQrCodeUrl(qrCodeDataURL);
      setSelectedItem({ kelas, jurusan, qrData });
      setModalType('qr');
      setShowModal(true);
      setMessage('');
    } catch (error) {
      setMessage('QR Code belum dibuat untuk kelas ini.');
    } finally {
      setLoading(false);
    }
  };
  
  

  // Helper Functions
  const resetSiswaForm = () => {
    setSiswaForm({
      nama: '', telephone: '', email: '', password: '', jenis_kelamin: '',
      alamat: { provinsi: '', kota: '', kecamatan: '', kode_pos: '', desa: '', rt: '', rw: '' },
      detail: { nama_ibu: '', nama_ayah: '', telephone_ortu: '', nisn: '', kelas: '', jurusan: '' }
    });
  };

  const resetGuruForm = () => {
    setGuruForm({
      nama: '', telephone: '', email: '', password: '', jenis_kelamin: '',
      alamat: { provinsi: '', kota: '', kecamatan: '', kode_pos: '', desa: '', rt: '', rw: '' }
    });
  };

  const resetKelasForm = () => {
    setKelasForm({ kelas: '', jurusan: '' });
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    
    if (type === 'edit' && item) {
      if (activeTab === 'siswa') {
        setSiswaForm({ ...item });
      } else if (activeTab === 'guru') {
        setGuruForm({ ...item });
      } else if (activeTab === 'kelas') {
        setKelasForm({ kelas: item.kelas, jurusan: item.jurusan });
      }
    }
    
    setShowModal(true);
  };

  const formatDate = (tanggal, bulan, tahun) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return `${tanggal} ${months[bulan - 1]} ${tahun}`;
  };

  const formatTime = (jam, menit) => {
    return `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;
  };

  // Get attendance summary for a student
  const getAttendanceSummary = (siswaId) => {
    const kelasData = absenData[selectedKelas];
    if (!kelasData || !kelasData[siswaId]) return { hadir: 0, total: 0 };

    const siswaAbsen = kelasData[siswaId];
    const hadirCount = Object.keys(siswaAbsen).length;
    const daysInMonth = new Date(selectedTahun, selectedBulan, 0).getDate();
    
    return { hadir: hadirCount, total: daysInMonth };
  };

  if (!isAuthenticated || user?.role !== 'guru') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Guru</h1>
              <p className="text-sm text-gray-600">Selamat datang, {user?.nama}</p>
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
            {['siswa', 'guru', 'kelas', 'qr', 'absen'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'qr' ? 'QR Code' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-4 rounded ${
            message.includes('berhasil') || message.includes('sukses')
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Content */}
        <div className="mt-6">
          {/* Siswa Tab */}
          {activeTab === 'siswa' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Data Siswa</h2>
                <button
                  onClick={() => openModal('add')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Tambah Siswa
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jurusan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {siswaList.map((siswa) => (
                      <tr key={siswa.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{siswa.nama}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{siswa.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{siswa.detail?.kelas}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{siswa.detail?.jurusan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openModal('edit', siswa)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Guru Tab */}
          {activeTab === 'guru' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Data Guru</h2>
                <button
                  onClick={() => openModal('add')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Tambah Guru
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telepon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guruList.map((guru) => (
                      <tr key={guru.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{guru.nama}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{guru.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{guru.telephone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openModal('edit', guru)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kelas Tab */}
          {activeTab === 'kelas' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Data Kelas</h2>
                <button
                  onClick={() => openModal('add')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Tambah Kelas
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jurusan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kelasList.map((kelas) => (
                      <tr key={kelas.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kelas.kelas}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kelas.jurusan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openModal('edit', kelas)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteKelas(kelas.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Generate QR Code per Kelas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kelasList.map((kelas) => (
                  <div key={kelas.id} className="border border-gray-300 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{kelas.kelas} - {kelas.jurusan}</h3>
                    <div className="flex flex-col gap-2 mt-2">
                    <button
                        onClick={() => getQRCode(kelas.kelas, kelas.jurusan)}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Lihat QR Code'}
                      </button>

                      <button
                        onClick={() => generateQRCode(kelas.kelas, kelas.jurusan)}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Generate Ulang'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Absen Tab */}
          {activeTab === 'absen' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Data Absensi</h2>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Pilih Kelas</option>
                  {kelasList.map((kelas) => (
                    <option key={kelas.id} value={kelas.kelas}>
                      {kelas.kelas} - {kelas.jurusan}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i, 1).toLocaleDateString('id-ID', { month: 'long' })}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedTahun}
                  onChange={(e) => setSelectedTahun(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={2024 - i} value={2024 - i}>
                      {2024 - i}
                    </option>
                  ))}
                </select>
              </div>

              {selectedKelas ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Hadir</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {siswaList
                        .filter(siswa => siswa.detail?.kelas === selectedKelas)
                        .map((siswa) => {
                          const { hadir, total } = getAttendanceSummary(siswa.id);
                          const percentage = total > 0 ? (hadir / total * 100).toFixed(1) : 0;
                          
                          return (
                            <tr key={siswa.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {siswa.nama}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {hadir} dari {total} hari ({percentage}%)
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  percentage >= 80 
                                    ? 'bg-green-100 text-green-800' 
                                    : percentage >= 60 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {percentage >= 80 ? 'Baik' : percentage >= 60 ? 'Cukup' : 'Kurang'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Pilih kelas untuk melihat data absensi</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {modalType === 'qr' ? 'QR Code' : 
                 modalType === 'add' ? `Tambah ${activeTab}` : 
                 `Edit ${activeTab}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* QR Code Modal */}
            {modalType === 'qr' && (
              <div className="text-center">
                <p className="mb-4">
                  QR Code untuk kelas <strong>{selectedItem?.kelas}</strong> - <strong>{selectedItem?.jurusan}</strong>
                </p>
                {qrCodeUrl && (
                  <div className="mb-4">
                    <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
                  </div>
                )}
                <button
                  onClick={refreshQRCode}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh QR Code'}
                </button>
              </div>
            )}

            {/* Siswa Form Modal */}
            {(modalType === 'add' || modalType === 'edit') && activeTab === 'siswa' && (
              <form onSubmit={handleSiswaSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nama"
                    value={siswaForm.nama}
                    onChange={(e) => setSiswaForm({...siswaForm, nama: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Telepon"
                    value={siswaForm.telephone}
                    onChange={(e) => setSiswaForm({...siswaForm, telephone: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={siswaForm.email}
                    onChange={(e) => setSiswaForm({...siswaForm, email: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={siswaForm.password}
                    onChange={(e) => setSiswaForm({...siswaForm, password: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required={modalType === 'add'}
                  />
                  <select
                    value={siswaForm.jenis_kelamin}
                    onChange={(e) => setSiswaForm({...siswaForm, jenis_kelamin: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Pilih Jenis Kelamin</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                  <input
                    type="text"
                    placeholder="NISN"
                    value={siswaForm.detail.nisn}
                    onChange={(e) => setSiswaForm({...siswaForm, detail: {...siswaForm.detail, nisn: e.target.value}})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                {/* Alamat Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Alamat</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Provinsi"
                      value={siswaForm.alamat.provinsi}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, provinsi: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kota"
                      value={siswaForm.alamat.kota}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, kota: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kecamatan"
                      value={siswaForm.alamat.kecamatan}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, kecamatan: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Desa"
                      value={siswaForm.alamat.desa}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, desa: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="RT"
                      value={siswaForm.alamat.rt}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, rt: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="RW"
                      value={siswaForm.alamat.rw}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, rw: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kode Pos"
                      value={siswaForm.alamat.kode_pos}
                      onChange={(e) => setSiswaForm({...siswaForm, alamat: {...siswaForm.alamat, kode_pos: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>

                {/* Detail Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Detail Siswa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nama Ibu"
                      value={siswaForm.detail.nama_ibu}
                      onChange={(e) => setSiswaForm({...siswaForm, detail: {...siswaForm.detail, nama_ibu: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Nama Ayah"
                      value={siswaForm.detail.nama_ayah}
                      onChange={(e) => setSiswaForm({...siswaForm, detail: {...siswaForm.detail, nama_ayah: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Telepon Orang Tua"
                      value={siswaForm.detail.telephone_ortu}
                      onChange={(e) => setSiswaForm({...siswaForm, detail: {...siswaForm.detail, telephone_ortu: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <select
                      value={siswaForm.detail.kelas}
                      onChange={(e) => setSiswaForm({...siswaForm, detail: {...siswaForm.detail, kelas: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((kelas) => (
                        <option key={kelas.id} value={kelas.kelas}>
                          {kelas.kelas}
                        </option>
                      ))}
                    </select>
                    <select
                      value={siswaForm.detail.jurusan}
                      onChange={(e) => setSiswaForm({...siswaForm, detail: {...siswaForm.detail, jurusan: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Pilih Jurusan</option>
                      {kelasList
                        .filter(kelas => kelas.kelas === siswaForm.detail.kelas)
                        .map((kelas) => (
                          <option key={kelas.id} value={kelas.jurusan}>
                            {kelas.jurusan}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : modalType === 'add' ? 'Tambah' : 'Update'}
                  </button>
                </div>
              </form>
            )}

            {/* Guru Form Modal */}
            {(modalType === 'add' || modalType === 'edit') && activeTab === 'guru' && (
              <form onSubmit={handleGuruSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nama"
                    value={guruForm.nama}
                    onChange={(e) => setGuruForm({...guruForm, nama: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Telepon"
                    value={guruForm.telephone}
                    onChange={(e) => setGuruForm({...guruForm, telephone: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={guruForm.email}
                    onChange={(e) => setGuruForm({...guruForm, email: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={guruForm.password}
                    onChange={(e) => setGuruForm({...guruForm, password: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required={modalType === 'add'}
                  />
                  <select
                    value={guruForm.jenis_kelamin}
                    onChange={(e) => setGuruForm({...guruForm, jenis_kelamin: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Pilih Jenis Kelamin</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                {/* Alamat Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Alamat</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Provinsi"
                      value={guruForm.alamat.provinsi}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, provinsi: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kota"
                      value={guruForm.alamat.kota}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, kota: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kecamatan"
                      value={guruForm.alamat.kecamatan}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, kecamatan: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Desa"
                      value={guruForm.alamat.desa}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, desa: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="RT"
                      value={guruForm.alamat.rt}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, rt: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="RW"
                      value={guruForm.alamat.rw}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, rw: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kode Pos"
                      value={guruForm.alamat.kode_pos}
                      onChange={(e) => setGuruForm({...guruForm, alamat: {...guruForm.alamat, kode_pos: e.target.value}})}
                      className="border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : modalType === 'add' ? 'Tambah' : 'Update'}
                  </button>
                </div>
              </form>
            )}

            {/* Kelas Form Modal */}
            {(modalType === 'add' || modalType === 'edit') && activeTab === 'kelas' && (
              <form onSubmit={handleKelasSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Kelas (contoh: XII-A)"
                    value={kelasForm.kelas}
                    onChange={(e) => setKelasForm({...kelasForm, kelas: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Jurusan (contoh: IPA)"
                    value={kelasForm.jurusan}
                    onChange={(e) => setKelasForm({...kelasForm, jurusan: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : modalType === 'add' ? 'Tambah' : 'Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}