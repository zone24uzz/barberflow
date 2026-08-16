import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import AuthGate from './components/AuthGate';
import WalkInModal from './components/WalkInModal';
import PaymentModal from './components/PaymentModal';
import BarberFlowAIAssistant from './components/BarberFlowAIAssistant';
import OwnerView from './components/views/OwnerView';
import BarberView from './components/views/BarberView';
import ClientView from './components/views/ClientView';
import { Sparkles, Scissors, Shield } from 'lucide-react';
import { sound } from './utils/sound';

export default function App() {
  const { 
    currentRole,
    currentUser,
    fetchServerState,
    setIsOnline, 
    syncOfflineQueue,
    isOnline,
    isSimulatedOffline
  } = useAppStore();

  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  useEffect(() => {
    // 1. Initial fetch from server
    fetchServerState();

    // 2. Browser online/offline event listeners
    const handleOnline = () => {
      console.log('🌐 Network status changed: ONLINE');
      setIsOnline(true);
      syncOfflineQueue();
    };

    const handleOffline = () => {
      console.log('⚡ Network status changed: OFFLINE');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. WebSocket Connection for live real-time state broadcast
    let ws = null;
    let reconnectTimeout = null;

    const connectWS = () => {
      if (!isOnline || isSimulatedOffline) return;

      try {
        let wsUrl;
        if (import.meta.env.VITE_WS_URL) {
          wsUrl = import.meta.env.VITE_WS_URL;
        } else if (import.meta.env.VITE_API_URL) {
          const apiHost = import.meta.env.VITE_API_URL.replace(/^http/, 'ws');
          wsUrl = `${apiHost}/ws`;
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.hostname}:5050/ws`;
        }
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('⚡ Connected to BarberFlow Realtime WebSocket');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATE_UPDATE' || msg.type === 'INITIAL_STATE') {
              useAppStore.setState({
                profiles: msg.data.profiles || [],
                services: msg.data.services || [],
                appointments: msg.data.appointments || [],
                inventory: msg.data.inventory || [],
                transactions: msg.data.transactions || []
              });
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          // Reconnect after 3s
          reconnectTimeout = setTimeout(connectWS, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        console.warn('WS not available in standalone/offline mode:', err);
      }
    };

    connectWS();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isOnline, isSimulatedOffline]);

  // Protected roles: owner and barber require an authenticated account with matching role.
  // Client portal is open for live queue booking & tracking.
  const needsAuth =
    (currentRole === 'owner' && currentUser?.role !== 'owner') ||
    (currentRole === 'barber' && currentUser?.role !== 'barber');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <Navbar onOpenAI={() => setIsAIAssistantOpen(true)} />
      <OfflineBanner />

      <main className="flex-1 pb-20">
        {needsAuth ? (
          <AuthGate initialRole={currentRole} />
        ) : (
          <>
            {currentRole === 'owner' && <OwnerView />}
            {currentRole === 'barber' && <BarberView />}
            {currentRole === 'client' && <ClientView />}
          </>
        )}
      </main>

      {/* Floating AI Assistant Trigger Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            sound.play('click');
            setIsAIAssistantOpen(true);
          }}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 border border-amber-300/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-lg bg-slate-950/20 flex items-center justify-center">
            {currentRole === 'owner' && <Shield className="w-4 h-4 text-slate-950" />}
            {currentRole === 'barber' && <Scissors className="w-4 h-4 text-slate-950" />}
            {currentRole === 'client' && <Sparkles className="w-4 h-4 text-slate-950" />}
          </div>
          <span className="tracking-tight">
            {currentRole === 'owner' && 'AI Biznes Analitik'}
            {currentRole === 'barber' && 'Usta Co-Pilot AI'}
            {currentRole === 'client' && '✨ AI Stilist (Rasm & Turmak)'}
          </span>
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping ml-0.5" />
        </button>
      </div>

      {/* Modals & AI Assistant Drawer */}
      <BarberFlowAIAssistant 
        isOpen={isAIAssistantOpen} 
        onClose={() => setIsAIAssistantOpen(false)} 
      />
      <WalkInModal />
      <PaymentModal />

      {/* Footer / Hackathon Badge */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>💈 <strong>BarberFlow Micro-CRM</strong> — Mahalla sartaroshxonasi uchun 100% Offline-First yechim</span>
          <span className="text-[11px] text-slate-600">React + Vite + Tailwind + Zustand + Gemini 3.7 Flash AI</span>
        </div>
      </footer>
    </div>
  );
}
