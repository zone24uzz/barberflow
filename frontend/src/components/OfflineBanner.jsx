import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { WifiOff, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, isSimulatedOffline, offlineQueue, toggleSimulatedOffline } = useAppStore();
  const isEffectiveOffline = !isOnline || isSimulatedOffline;

  if (!isEffectiveOffline && offlineQueue.length === 0) return null;

  return (
    <div className={`w-full py-2.5 px-4 text-xs sm:text-sm font-medium transition-all ${
      isEffectiveOffline 
        ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg' 
        : 'bg-cyan-900/80 text-cyan-200 border-b border-cyan-700/50'
    }`}>
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isEffectiveOffline ? (
            <WifiOff className="w-4 h-4 animate-bounce shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>
            {isEffectiveOffline ? (
              <>
                <strong>Offline Rejim:</strong> Internet yo'q, lekin tizim to'liq ishlamoqda! Barcha kassa va navbatlar brauzerda (Local Storage) xavfsiz saqlanmoqda.
              </>
            ) : (
              <>
                Internet qayta ulandi. <strong>{offlineQueue.length} ta lokal amal</strong> serverga sinxronizatsiya qilinmoqda.
              </>
            )}
          </span>
        </div>

        {isSimulatedOffline && (
          <button
            onClick={toggleSimulatedOffline}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/30 hover:bg-black/40 text-xs font-bold transition-colors"
          >
            <span>Internetni yoqish</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
