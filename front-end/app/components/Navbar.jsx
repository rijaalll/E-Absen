/* === File: components/Navbar.jsx === */
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar({ user }) {
    const router = useRouter();
    const pathname = usePathname();
    const role = user?.role;

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        router.push('/login');
    };

    const guruLinks = [
        { href: '/guru/dashboard', label: 'Dashboard' },
        { href: '/guru/siswa', label: 'Manajemen Siswa' },
        { href: '/guru/absensi', label: 'Rekap Absensi' },
    ];

    const siswaLinks = [
        { href: '/siswa/dashboard', label: 'Dashboard' },
        { href: '/siswa/riwayat', label: 'Riwayat Kehadiran' },
    ];

    const links = role === 'guru' ? guruLinks : siswaLinks;

    return (
        <nav className="bg-white shadow-md">
            <div className="container px-4 mx-auto">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href={role === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'}>
                           <span className="font-bold text-xl text-indigo-600">AbsenApp</span>
                        </Link>
                        <div className="hidden md:block">
                            <div className="flex items-baseline ml-10 space-x-4">
                                {links.map(link => (
                                    <Link key={link.href} href={link.href}>
                                        <span className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === link.href ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
                                            {link.label}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center">
                         <span className="mr-4 text-gray-800">Halo, {user?.nama}</span>
                        <button onClick={handleLogout} className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
