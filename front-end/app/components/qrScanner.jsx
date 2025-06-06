
/* === File: components/QrScanner.jsx === */
'use client';
import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QrScanner({ onScanSuccess }) {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            'reader', 
            {
                qrbox: {
                    width: 250,
                    height: 250,
                },
                fps: 5,
            },
            false // verbose
        );

        const handleSuccess = (decodedText, decodedResult) => {
            scanner.clear(); // Hentikan scanner setelah berhasil
            onScanSuccess(decodedText);
        };

        const handleError = (error) => {
            // console.warn(error); // Bisa diabaikan untuk error minor
        };
        
        scanner.render(handleSuccess, handleError);

        // Cleanup function untuk membersihkan scanner saat komponen unmount
        return () => {
            scanner.clear().catch(error => {
                console.error("Gagal membersihkan scanner.", error);
            });
        };
    }, [onScanSuccess]);

    return (
        <div id="reader" style={{ width: '300px' }}></div>
    );
}
