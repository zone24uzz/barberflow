import React from 'react';
import { X, Printer, QrCode, Scissors } from 'lucide-react';
import { sound } from '../utils/sound';

export default function ThermalReceiptModal({ transaction, onClose }) {
  if (!transaction) return null;

  const handlePrint = () => {
    sound.play('click');
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 shadow-2xl relative font-mono text-xs select-text">
        {/* Close button */}
        <button
          onClick={() => { sound.play('click'); onClose(); }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors print:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Receipt Header */}
        <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white mx-auto flex items-center justify-center mb-2">
            <Scissors className="w-4 h-4" />
          </div>
          <h2 className="font-black text-sm tracking-tight uppercase font-sans">BarberFlow Micro-CRM</h2>
          <p className="text-[11px] text-slate-500 font-sans">Mahalla Sartaroshxonasi #1</p>
          <p className="text-[10px] text-slate-400">STIR: 308941204 • Tel: +998 71 200 00 00</p>
        </div>

        {/* Transaction Metadata */}
        <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Kassa Cheki:</span>
            <span className="font-bold">#{transaction.id?.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Sana & Vaqt:</span>
            <span>{new Date(transaction.created_at).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mijoz:</span>
            <span className="font-bold font-sans">{transaction.client_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">To'lov turi:</span>
            <span className="font-bold uppercase text-emerald-700 font-sans">{transaction.payment_type}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
          <div className="flex justify-between font-bold text-[11px]">
            <span>Xizmat</span>
            <span>Narxi</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="font-sans">Soch & Soqol xizmati</span>
            <span className="font-bold">{Number(transaction.amount).toLocaleString()} UZS</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Usta ulushi (50%):</span>
            <span>{(Number(transaction.amount) * 0.5).toLocaleString()} UZS</span>
          </div>
        </div>

        {/* Total */}
        <div className="py-3 border-b border-slate-300 space-y-1">
          <div className="flex justify-between text-sm font-black font-sans">
            <span>JAMI TO'LANDI:</span>
            <span className="text-emerald-700">{Number(transaction.amount).toLocaleString()} UZS</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>QQS (0%):</span>
            <span>0 UZS</span>
          </div>
        </div>

        {/* QR Verification & Barcode */}
        <div className="pt-4 text-center space-y-2">
          <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-xl mx-auto flex items-center justify-center">
            <QrCode className="w-16 h-16 text-slate-800" />
          </div>
          <p className="text-[10px] text-slate-400 font-sans">
            Xaridingiz uchun rahmat! Chek elektron tizimda ro'yxatga olindi.
          </p>
        </div>

        {/* Print Action */}
        <div className="mt-5 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Chekni Chop Etish (Print)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
