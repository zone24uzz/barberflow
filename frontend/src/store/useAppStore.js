import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Core Data
      profiles: [],
      services: [],
      appointments: [],
      inventory: [],
      transactions: [],

      // Navigation & Role
      currentRole: 'owner', // 'owner' | 'barber' | 'client'
      selectedBarberId: 'barber-1',

      // Network & Offline resilience state
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSimulatedOffline: false,
      offlineQueue: [], // array of { id, type, payload, timestamp }
      isSyncing: false,
      lastSyncedAt: null,

      // UI States
      isWalkInModalOpen: false,
      activePaymentApt: null, // appointment being checked out

      // Setters
      setCurrentRole: (role) => set({ currentRole: role }),
      setSelectedBarberId: (barberId) => set({ selectedBarberId: barberId }),
      setIsWalkInModalOpen: (isOpen) => set({ isWalkInModalOpen: isOpen }),
      setActivePaymentApt: (apt) => set({ activePaymentApt: apt }),
      setIsOnline: (status) => set({ isOnline: status }),
      toggleSimulatedOffline: () => {
        const next = !get().isSimulatedOffline;
        set({ isSimulatedOffline: next });
        if (!next && get().isOnline) {
          get().syncOfflineQueue();
        }
      },

      // Effective connection status
      getEffectiveOnline: () => {
        return get().isOnline && !get().isSimulatedOffline;
      },

      // Fetch state from server or fallback to local
      fetchServerState: async () => {
        if (!get().getEffectiveOnline()) return;

        try {
          const res = await fetch(`${API_BASE}/api/state`);
          if (res.ok) {
            const data = await res.json();
            set({
              profiles: data.profiles || [],
              services: data.services || [],
              appointments: data.appointments || [],
              inventory: data.inventory || [],
              transactions: data.transactions || [],
              lastSyncedAt: new Date().toLocaleTimeString('uz-UZ')
            });
          }
        } catch (err) {
          console.warn('Backend unavailable, using persistent offline state:', err);
        }
      },

      // Add appointment (Walk-in or online booking)
      addAppointment: async (aptData) => {
        const barberId = aptData.barber_id || get().selectedBarberId || 'barber-1';
        const service = get().services.find(s => s.id === aptData.service_id) || get().services[0];
        
        const existingWaiting = get().appointments.filter(
          a => a.barber_id === barberId && (a.status === 'waiting' || a.status === 'in_progress')
        );
        const queue_number = existingWaiting.length + 1;

        const newApt = {
          id: `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          client_name: aptData.client_name || 'Noma\'lum mijoz',
          client_phone: aptData.client_phone || '+998 90 000 00 00',
          barber_id: barberId,
          service_id: service ? service.id : 'srv-1',
          status: 'waiting',
          queue_number,
          scheduled_time: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          price: service ? service.price : 50000,
          is_offline_created: !get().getEffectiveOnline(),
          created_at: new Date().toISOString()
        };

        // Optimistic local update
        set((state) => ({
          appointments: [...state.appointments, newApt]
        }));

        if (get().getEffectiveOnline()) {
          try {
            await fetch(`${API_BASE}/api/appointments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newApt)
            });
          } catch {
            get().enqueueOfflineAction('ADD_APPOINTMENT', newApt);
          }
        } else {
          get().enqueueOfflineAction('ADD_APPOINTMENT', newApt);
        }

        return newApt;
      },

      // Update appointment status (waiting -> in_progress -> completed | no_show | cancelled)
      updateAppointmentStatus: async (aptId, status, paymentType = 'cash') => {
        const apt = get().appointments.find(a => a.id === aptId);
        if (!apt) return;

        const now = new Date().toISOString();
        let updatedApt = { ...apt, status };

        if (status === 'in_progress') {
          updatedApt.started_at = now;
        } else if (status === 'completed') {
          updatedApt.completed_at = now;
          
          // Auto record transaction
          const newTx = {
            id: `tx-${Date.now()}`,
            appointment_id: apt.id,
            client_name: apt.client_name,
            barber_id: apt.barber_id,
            amount: apt.price,
            payment_type: paymentType,
            created_at: now
          };

          // Auto deduct 1 blade from inventory
          set((state) => ({
            transactions: [newTx, ...state.transactions],
            inventory: state.inventory.map(inv => {
              if (inv.id === 'inv-1' && inv.stock_quantity > 0) {
                return { ...inv, stock_quantity: inv.stock_quantity - 1 };
              }
              return inv;
            })
          }));
        } else if (status === 'no_show' || status === 'cancelled') {
          updatedApt.completed_at = now;
        }

        // Apply appointment update locally
        set((state) => ({
          appointments: state.appointments.map(a => a.id === aptId ? updatedApt : a)
        }));

        const payload = { id: aptId, status, payment_type: paymentType };

        if (get().getEffectiveOnline()) {
          try {
            await fetch(`${API_BASE}/api/appointments/${aptId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } catch {
            get().enqueueOfflineAction('UPDATE_STATUS', payload);
          }
        } else {
          get().enqueueOfflineAction('UPDATE_STATUS', payload);
        }
      },

      // Restock inventory item
      restockInventory: async (itemId, amount = 10) => {
        set((state) => ({
          inventory: state.inventory.map(item => {
            if (item.id === itemId) {
              return { ...item, stock_quantity: item.stock_quantity + amount };
            }
            return item;
          })
        }));

        const item = get().inventory.find(i => i.id === itemId);
        if (get().getEffectiveOnline() && item) {
          try {
            await fetch(`${API_BASE}/api/inventory/${itemId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stock_quantity: item.stock_quantity })
            });
          } catch (e) {
            console.error('Error syncing inventory:', e);
          }
        }
      },

      // Enqueue offline action for sync
      enqueueOfflineAction: (type, payload) => {
        const action = {
          id: `action-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type,
          payload,
          timestamp: new Date().toISOString()
        };
        set((state) => ({
          offlineQueue: [...state.offlineQueue, action]
        }));
      },

      // Reconcile offline queue with server (FIFO)
      syncOfflineQueue: async () => {
        const queue = get().offlineQueue;
        if (queue.length === 0 || !get().getEffectiveOnline()) return;

        set({ isSyncing: true });
        try {
          const res = await fetch(`${API_BASE}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actions: queue })
          });

          if (res.ok) {
            const data = await res.json();
            set({
              offlineQueue: [],
              isSyncing: false,
              lastSyncedAt: new Date().toLocaleTimeString('uz-UZ'),
              profiles: data.state?.profiles || get().profiles,
              services: data.state?.services || get().services,
              appointments: data.state?.appointments || get().appointments,
              inventory: data.state?.inventory || get().inventory,
              transactions: data.state?.transactions || get().transactions
            });
          }
        } catch (err) {
          console.error('Sync failed:', err);
          set({ isSyncing: false });
        }
      },

      // Reset to initial demo dataset
      resetDemo: async () => {
        try {
          if (get().getEffectiveOnline()) {
            await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
          }
          // Also fetch fresh server state
          await get().fetchServerState();
        } catch {
          // If offline, reload local defaults
          window.location.reload();
        }
      }
    }),
    {
      name: 'barberflow_local_db_v1', // Persistent storage in browser
      partialize: (state) => ({
        profiles: state.profiles,
        services: state.services,
        appointments: state.appointments,
        inventory: state.inventory,
        transactions: state.transactions,
        offlineQueue: state.offlineQueue,
        selectedBarberId: state.selectedBarberId
      })
    }
  )
);
