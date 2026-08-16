import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  Play, 
  CheckCircle, 
  UserX, 
  Clock, 
  Coffee, 
  Scissors, 
  Plus, 
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { sound } from '../../utils/sound';

export default function BarberView() {
  const { 
    profiles, 
    services, 
    appointments, 
    transactions,
    selectedBarberId, 
    setSelectedBarberId, 
    updateAppointmentStatus, 
    setActivePaymentApt,
    setIsWalkInModalOpen 
  } = useAppStore();

  const [onBreak, setOnBreak] = useState(false);
  const barbers = profiles.filter(p => p.role === 'barber');
  const currentBarber = barbers.find(b => b.id === selectedBarberId) || barbers[0];

  // Appointments for this specific barber
  const myWaiting = appointments.filter(a => a.barber_id === currentBarber?.id && a.status === 'waiting');
  const myInProgress = appointments.find(a => a.barber_id === currentBarber?.id && a.status === 'in_progress');
  const myCompleted = appointments.filter(a => a.barber_id === currentBarber?.id && a.status === 'completed');

  // Barber Earnings calculation (50% commission)
  const myEarningsTotal = transactions
    .filter(t => t.barber_id === currentBarber?.id)
    .reduce((acc, t) => acc + (Number(t.amount) * 0.5), 0);

  const activeService = services.find(s => s.id === myInProgress?.service_id);

  const handleStartNext = () => {
    sound.play('bell');
    if (myWaiting.length > 0) {
      updateAppointmentStatus(myWaiting[0].id, 'in_progress');
    }
  };

  const handleNoShow = (aptId) => {
    sound.play('click');
    if (confirm('Ushbu mijoz kelmadimi? Navbat keyingisiga suriladi.')) {
      updateAppointmentStatus(aptId, 'no_show');
    }
  };

  const handleStartIndividual = (aptId) => {
    sound.play('bell');
    updateAppointmentStatus(aptId, 'in_progress');
  };

  const handleOpenCheckout = (apt) => {
    sound.play('cash');
    setActivePaymentApt(apt);
  };

  const handleBreakToggle = () => {
    sound.play('toggle');
    setOnBreak(!onBreak);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Barber Switcher */}
      <div className="p-1 rounded-2xl bg-[#10121a] border border-white/[0.06] flex items-center justify-between gap-1 shadow-sm">
        {barbers.map(barber => (
          <button
            key={barber.id}
            onClick={() => { sound.play('click'); setSelectedBarberId(barber.id); }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              selectedBarberId === barber.id
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedBarberId === barber.id ? 'bg-slate-950' : 'bg-amber-400'}`} />
            <span className="truncate">{barber.full_name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* 2. Barber Profile & Earnings Hub */}
      <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-lg">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight">{currentBarber?.full_name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Shaxsiy daromad (50%):</span>
              <strong className="text-emerald-400 font-extrabold text-sm tabular-nums">{myEarningsTotal.toLocaleString()} UZS</strong>
            </div>
          </div>
        </div>

        {/* Break button */}
        <button
          onClick={handleBreakToggle}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
            onBreak 
              ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-sm' 
              : 'bg-[#181a24] border-white/[0.08] text-slate-300 hover:bg-[#202330]'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>{onBreak ? 'Tanaffusda' : 'Pauza'}</span>
        </button>
      </div>

      {/* 3. ACTIVE CLIENT HERO CARD */}
      <div className="p-6 rounded-3xl bg-[#10121a] border border-white/[0.08] space-y-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Kreslodagi Mijoz</span>
          </span>
          <span className="text-xs text-slate-400 font-medium">Stansiya #1</span>
        </div>

        {myInProgress ? (
          <div className="space-y-5">
            <div className="text-center py-6 px-4 bg-[#0b0c10] border border-white/[0.04] rounded-2xl space-y-2">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {myInProgress.client_name}
              </div>
              <p className="text-sm font-semibold text-amber-300">
                {activeService?.name || 'Klassik Soch Olish'}
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-400 pt-2 border-t border-white/[0.04] mt-2">
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeService?.duration_minutes || 20} daqiqa</span>
                </span>
                <span>•</span>
                <span className="font-extrabold text-emerald-400 text-sm tabular-nums">
                  {myInProgress.price.toLocaleString()} UZS
                </span>
              </div>
            </div>

            {/* 2 Big Action Touch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleOpenCheckout(myInProgress)}
                className="w-full py-4 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Xizmatni Yakunlash (Kassa)</span>
              </button>

              <button
                onClick={() => handleNoShow(myInProgress.id)}
                className="w-full py-4 px-4 rounded-xl font-semibold text-xs bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <UserX className="w-4 h-4" />
                <span>Mijoz Kelmadi (No-Show)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0b0c10] border border-white/[0.04] mx-auto flex items-center justify-center text-slate-400">
              <Scissors className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Stansiya bo'sh</h3>
              <p className="text-xs text-slate-400 mt-1">
                Navbatingizda {myWaiting.length} ta mijoz kutmoqda
              </p>
            </div>

            {myWaiting.length > 0 ? (
              <button
                onClick={handleStartNext}
                className="w-full py-4 px-6 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Navbatdagi mijozni chaqirish ({myWaiting[0].client_name})</span>
              </button>
            ) : (
              <button
                onClick={() => { sound.play('click'); setIsWalkInModalOpen(true); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#181a24] hover:bg-[#202330] text-amber-400 border border-white/[0.08] transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi mijoz kiritish</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. NEXT CLIENTS IN QUEUE */}
      <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Mening Navbatim ({myWaiting.length} kishi)</span>
          </h3>
          <button
            onClick={() => { sound.play('click'); setIsWalkInModalOpen(true); }}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Qo'shish</span>
          </button>
        </div>

        {myWaiting.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Kutayotgan navbatlar yo'q</p>
        ) : (
          <div className="space-y-2">
            {myWaiting.map((apt, idx) => {
              const srv = services.find(s => s.id === apt.service_id);
              return (
                <div 
                  key={apt.id}
                  className="p-3.5 rounded-xl bg-[#0b0c10] border border-white/[0.04] flex items-center justify-between text-xs transition-all hover:border-white/[0.08]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-300 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white text-sm">{apt.client_name}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{srv?.name || 'Xizmat'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNoShow(apt.id)}
                      title="Mijoz kelmadi"
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/50 transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartIndividual(apt.id)}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Boshlash</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
