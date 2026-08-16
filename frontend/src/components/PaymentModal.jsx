import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, Banknote, CreditCard, QrCode } from 'lucide-react';
import { sound } from '../utils/sound';

export default function PaymentModal() {
  const { activePaymentApt, setActivePaymentApt, updateAppointmentStatus, services } = useAppStore();
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'card' | 'uzum'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!activePaymentApt) return null;

  const service = services.find(s => s.id === activePaymentApt.service_id);
  const amount = activePaymentApt.price || service?.price || 50000;

  const handleCompletePayment = async () => {
    sound.play('cash');
    setIsProcessing(true);
    
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.65 }
      });
    } catch {}

    await updateAppointmentStatus(activePaymentApt.id, 'completed', paymentType);
    setIsProcessing(false);
    setActivePaymentApt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm bg-[#10121a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="font-bold text-base text-white">To'lov Qabul Qilish</h3>
            <p className="text-xs text-slate-400">Xizmatni yakunlash va kassa hisobiga urish</p>
          </div>
          <button
            onClick={() => { sound.play('click'); setActivePaymentApt(null); }}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client & Amount summary */}
        <div className="my-5 p-5 rounded-2xl bg-[#0b0c10] border border-white/[0.06] text-center space-y-1">
          <p className="text-xs text-slate-400">Mijoz: <span className="text-white font-bold">{activePaymentApt.client_name}</span></p>
          <div className="text-3xl font-black text-emerald-400 tracking-tight my-1 tabular-nums">
            {amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">{service?.name || 'Soch olish xizmati'}</p>
        </div>

        {/* Payment Methods */}
        <div className="space-y-2 mb-6">
          <label className="block text-xs font-semibold text-slate-400">To'lov usuli</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { sound.play('click'); setPaymentType('cash'); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs active:scale-95 ${
                paymentType === 'cash'
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500 shadow-sm'
                  : 'bg-[#0b0c10] border-white/[0.06] text-slate-400 hover:border-white/[0.1]'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span>Naqd</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.play('click'); setPaymentType('card'); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs active:scale-95 ${
                paymentType === 'card'
                  ? 'bg-amber-950/70 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500 shadow-sm'
                  : 'bg-[#0b0c10] border-white/[0.06] text-slate-400 hover:border-white/[0.1]'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Plastik</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.play('click'); setPaymentType('uzum'); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs active:scale-95 ${
                paymentType === 'uzum'
                  ? 'bg-purple-950/70 border-purple-500 text-purple-300 font-bold ring-1 ring-purple-500 shadow-sm'
                  : 'bg-[#0b0c10] border-white/[0.06] text-slate-400 hover:border-white/[0.1]'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>Uzum Pay</span>
            </button>
          </div>
        </div>

        {/* Complete Action */}
        <button
          onClick={handleCompletePayment}
          disabled={isProcessing}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Kassaga Urish & Yakunlash</span>
        </button>
      </div>
    </div>
  );
}
