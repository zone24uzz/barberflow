import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import WalkInModal from './components/WalkInModal';
import PaymentModal from './components/PaymentModal';
import OwnerView from './components/views/OwnerView';
import BarberView from './components/views/BarberView';
import ClientView from './components/views/ClientView';

export default function App() {
  const { 
    currentRole, 
    fetchServerState, 
    setIsOnline, 
    syncOfflineQueue,
    isOnline,
    isSimulatedOffline
  } = useAppStore();

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
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:5050/ws`;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <OfflineBanner />

      <main className="flex-1 pb-16">
        {currentRole === 'owner' && <OwnerView />}
        {currentRole === 'barber' && <BarberView />}
        {currentRole === 'client' && <ClientView />}
      </main>

      {/* Modals */}
      <WalkInModal />
      <PaymentModal />

      {/* Footer / Hackathon Badge */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>💈 <strong>BarberFlow Micro-CRM</strong> — Mahalla sartaroshxonasi uchun 100% Offline-First yechim</span>
          <span className="text-[11px] text-slate-600">React + Vite + Tailwind + Zustand + Node.js</span>
        </div>
      </footer>
    </div>
  );
}
