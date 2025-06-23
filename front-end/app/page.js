'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { authAPI } from './utils/api';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'guru') {
        router.push('/page/guru');
      } else if (user?.role === 'siswa') {
        router.push('/page/siswa');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });
      
      const { user: userData, token } = response.data;
      
      const userWithToken = {
        ...userData,
        authToken: token
      };
      
      login(userWithToken);
      
      if (userData.role === 'guru') {
        router.push('/page/guru');
      } else if (userData.role === 'siswa') {
        router.push('/page/siswa');
      }
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.error === 'Login ditolak. Akun ini sudah login di perangkat lain.' && errorData?.required_token) {
        setError('Akun sudah login di perangkat lain. Silakan hubungi admin untuk token autentikasi.');
      } else {
        setError(error.userMessage || errorData?.error || 'Login gagal. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="card w-full max-w-sm bg-base-100 shadow-2xl">
        <div className="card-body">
          <div className="flex justify-center mb-4">
            <div className="avatar">
              <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src="/school-logo.png" alt="School Logo" />
              </div>
            </div>
          </div>
          <h2 className="text-center text-2xl font-bold text-base-content">
            Sistem Absensi Sekolah
          </h2>
          <p className="text-center text-sm text-base-content/60 mt-2">
            Masuk ke akun Anda
          </p>
          
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input input-bordered w-full focus:input-primary"
                placeholder="Alamat email"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input input-bordered w-full focus:input-primary"
                placeholder="Password"
              />
            </div>

            {error && (
              <div className="alert alert-error shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </div>
          </form>
          
          <div className="text-center mt-4">
            <a href="#" className="text-sm text-primary hover:underline">
              Lupa password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}