'use client';

import React, { useEffect, useState, useRef } from 'react';
import { PatientData } from '@/lib/types';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, QrCode, Camera } from 'lucide-react';
import { useBackLayer } from '@/lib/back-navigation';
import { APP_NAME } from '@/lib/branding';

interface QRModalProps {
  mode: 'view' | 'scan';
  patient?: PatientData | null;
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (regNumber: string) => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  mode,
  patient,
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Generate QR Code image for patient card
  useEffect(() => {
    if (mode === 'view' && patient && isOpen) {
      QRCode.toDataURL(
        patient.regNumber,
        {
          width: 260,
          margin: 2,
          color: {
            dark: '#0a1317',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err) setQrDataUrl(url);
        }
      );
    }
  }, [mode, patient, isOpen]);

  // Handle Camera QR Scanner
  useEffect(() => {
    if (mode === 'scan' && isOpen) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          if (onScanSuccess) {
            onScanSuccess(decodedText);
          }
          scanner.clear();
          onClose();
        },
        () => {
          // scanning frame errors can be ignored
        }
      );

      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch((e) => console.error(e));
        }
      };
    }
  }, [mode, isOpen, onScanSuccess, onClose]);

  useBackLayer(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#e9edef]">
        {/* Header */}
        <div className="bg-[#075e54] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {mode === 'view' ? (
              <QrCode className="w-5 h-5 text-[#25d366]" />
            ) : (
              <Camera className="w-5 h-5 text-[#25d366]" />
            )}
            <h2 className="font-extrabold text-sm">
              {mode === 'view' ? 'Kartu QR Pasien' : 'Pindai QR Code Pasien'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VIEW MODE: QR CARD */}
        {mode === 'view' && patient && (
          <div className="p-6 text-center space-y-4">
            <div className="border border-[#e9edef] rounded-[24px] p-4.5 bg-[#f0f2f5]">
              <h3 className="font-black text-[#111b21] text-base">{patient.name}</h3>
              <p className="font-mono text-xs text-[#075e54] font-bold mt-0.5">
                {patient.regNumber}
              </p>

              {/* QR Image */}
              <div className="mt-4 flex justify-center">
                {qrDataUrl ? (
                  // QR dihasilkan dari data:image oleh pustaka qrcode — bukan <Image /> biasa.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR Code Pasien"
                    className="w-48 h-48 rounded-2xl shadow-xs border border-[#e9edef] bg-white p-2"
                  />
                ) : (
                  <div className="w-48 h-48 bg-white animate-pulse rounded-2xl flex items-center justify-center text-xs text-[#8696a0]">
                    Membuat QR...
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#54656f] font-medium">
                <span>{patient.ageDisplay}</span>
                <span>•</span>
                <span>{APP_NAME}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#54656f]">
              Tunjukkan QR ini ke meja kader posyandu untuk pencarian kilat.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs transition-all touch-press"
            >
              Tutup
            </button>
          </div>
        )}

        {/* SCAN MODE: CAMERA VIEWER */}
        {mode === 'scan' && (
          <div className="p-5 space-y-3.5">
            <p className="text-xs text-[#54656f] text-center font-medium">
              Arahkan kamera ke QR Code pada kartu pasien atau HP warga:
            </p>
            <div id="qr-reader-container" className="rounded-2xl overflow-hidden border border-[#e9edef]" />
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs transition-all touch-press border border-[#e9edef]"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

