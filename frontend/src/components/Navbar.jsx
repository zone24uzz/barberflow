import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Scissors, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  Send, 
  Shield, 
  UserCheck, 
  Smartphone,
  Volume2,
  VolumeX,
  BarChart3
} from 'lucide-react';
import { sound } from '../utils/sound';
import TelegramDrawer from './TelegramDrawer';
import AnalyticsModal from './AnalyticsModal';

export default function Navbar() {
  const { 
    currentRole, 
    setCurrentRole, 
    isOnline, 
    isSimulatedOffline, 
    toggleSimulatedOffline,
    offlineQueue,
    isSyncing,
    syncOfflineQueue,
    resetDemo
  } = useAppStore();

  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const isEffectiveOnline = isOnline && !isSimulatedOffline;

  const handleRoleChange = (role) => {
    sound.play('toggle');
    setCurrentRole(role);
  };

  const handleOfflineToggle = () => {
    sound.play('toggle');
    toggleSimulatedOffline();
  };

  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c0d12]/95 backdrop-blur-xl border-b border-white/[0.06] text-slate-100 select-none">
        {/* Warm Amber Accent Rim */}
        <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-600 opacity-90" />

        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Top Line: Brand + Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
            {/* Clean Brand Mark */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 p-[1px] shadow-sm">
                <div className="w-full h-full bg-[#0e1017] rounded-[11px] flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white">
                    BarberFlow
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Atelier Edition
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Mahalla Sartaroshxonalari Boshqaruv Tizimi</p>
              </div>
            </div>

            {/* Action Tools */}
            <div className="flex items-center gap-2">
              {/* Analytics Hub */}
              <button
                onClick={() => { sound.play('click'); setIsAnalyticsOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#14161f] hover:bg-[#1c1f2b] text-slate-300 border border-white/[0.08] transition-all shadow-sm active:scale-95"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Analitika</span>
              </button>

              {/* Telegram Bot Hub */}
              <button
                onClick={() => { sound.play('click'); setIsTelegramOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 transition-all shadow-sm active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Telegram Bot</span>
              </button>

              {/* Offline / Online Switcher */}
              <button
                onClick={handleOfflineToggle}
                title="Internet uzilishini simulyatsiya qilish (Hakamlar oldida demo uchun)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border active:scale-95 ${
                  isEffectiveOnline
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10'
                }`}
              >
                {isEffectiveOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Onlayn</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Offline (Lokal)</span>
                  </>
                )}
              </button>

              {/* Sync Queue */}
              {offlineQueue.length > 0 && (
                <button
                  onClick={() => { sound.play('click'); syncOfflineQueue(); }}
                  disabled={!isEffectiveOnline || isSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60 transition-all"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{offlineQueue.length} ta navbat</span>
                </button>
              )}

              {/* Audio Haptics */}
              <button
                onClick={handleToggleMute}
                title={isMuted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#14161f] rounded-xl transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
              </button>

              {/* Reset Demo */}
              <button
                onClick={() => {
                  sound.play('click');
                  if (confirm('Barcha demo ma\'lumotlarni toza holatga qaytarasizmi?')) {
                    resetDemo();
                  }
                }}
                title="Demoni qayta yuklash"
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#14161f] rounded-xl transition-all"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Role Navigation */}
          <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-2.5">
            {[
              { id: 'owner', label: 'Boshqaruv (Ega)', icon: Shield },
              { id: 'barber', label: 'Usta Paneli', icon: UserCheck },
              { id: 'client', label: 'Mijoz Navbati', icon: Smartphone }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = currentRole === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleRoleChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161f]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Drawers & Modals */}
      <TelegramDrawer isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
      <AnalyticsModal isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />
    </>
  );
}
