import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  Banknote,
  QrCode,
  Scissors,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { sound } from '../../utils/sound';
import ThermalReceiptModal from '../ThermalReceiptModal';

export default function OwnerView() {
  const { 
    profiles, 
    services, 
    appointments, 
    inventory, 
    transactions, 
    setIsWalkInModalOpen, 
    restockInventory,
    setActivePaymentApt,
    setCurrentRole,
    setSelectedBarberId
  } = useAppStore();

  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState(null);
  const barbers = profiles.filter(p => p.role === 'barber');

  // Metrics Calculations
  const totalRevenue = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const cashTotal = transactions.filter(t => t.payment_type === 'cash').reduce((acc, t) => acc + Number(t.amount), 0);
  const cardTotal = transactions.filter(t => t.payment_type === 'card').reduce((acc, t) => acc + Number(t.amount), 0);
  const uzumTotal = transactions.filter(t => t.payment_type === 'uzum').reduce((acc, t) => acc + Number(t.amount), 0);

  const waitingAppointments = appointments.filter(a => a.status === 'waiting');
  const inProgressAppointments = appointments.filter(a => a.status === 'in_progress');
  const completedToday = appointments.filter(a => a.status === 'completed');

  const lowStockItems = inventory.filter(i => i.stock_quantity <= i.min_alert_threshold);

  const handleOpenWalkIn = () => {
    sound.play('click');
    setIsWalkInModalOpen(true);
  };

  const handleRestock = (itemId) => {
    sound.play('success');
    restockInventory(itemId, 10);
  };

  const handleStationClick = (barberId) => {
    sound.play('toggle');
    setSelectedBarberId(barberId);
    setCurrentRole('barber');
  };

  const handleViewReceipt = (tx) => {
    sound.play('click');
    setSelectedTxForReceipt(tx);
  };

  return (
    <>
      <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
        {/* 1. Header Command Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <span>Boshqaruv Tizimi</span>
              <span>/</span>
              <span className="text-amber-400">Asosiy Monitoring</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sartaroshxona Boshqaruv Markazi
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time kassa hisob-kitobi, jonli navbat boshqaruvi va avtomatik ombor sarfi nazorati.
            </p>
          </div>

          {/* Quick Action Button */}
          <div>
            <button
              onClick={handleOpenWalkIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/10 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Mijoz Qo'shish</span>
            </button>
          </div>
        </div>

        {/* 2. Top Metric Cards (Warm Charcoal & Amber Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Metric 1: Kassa */}
          <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Kunlik Yalpi Tushum</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-emerald-400 tracking-tight tabular-nums">
                {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Jami {transactions.length} ta xizmat to'landi</p>
            </div>

            {/* Visual Breakdown Bar */}
            <div className="space-y-2 pt-3 border-t border-white/[0.04]">
              <div className="h-1.5 w-full bg-[#181a24] rounded-full flex overflow-hidden">
                <div style={{ width: `${totalRevenue > 0 ? (cashTotal/totalRevenue)*100 : 0}%` }} className="bg-emerald-500" />
                <div style={{ width: `${totalRevenue > 0 ? (cardTotal/totalRevenue)*100 : 0}%` }} className="bg-amber-500" />
                <div style={{ width: `${totalRevenue > 0 ? (uzumTotal/totalRevenue)*100 : 0}%` }} className="bg-purple-500" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Naqd: <strong className="text-slate-300">{cashTotal.toLocaleString()}</strong></span>
                <span>Plastik: <strong className="text-slate-300">{cardTotal.toLocaleString()}</strong></span>
                <span>Uzum: <strong className="text-slate-300">{uzumTotal.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Metric 2: Jonli Navbat */}
          <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Kutish Zali & Navbat</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-amber-400 tracking-tight tabular-nums">
                {waitingAppointments.length} <span className="text-xs font-normal text-slate-400">kutuvchi</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {inProgressAppointments.length} ta usta ayni paytda xizmat ko'rsatmoqda
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
              <span>O'rtacha vaqt: <strong className="text-slate-200">~15-20 daq</strong></span>
              <span className="text-emerald-400 font-semibold">{completedToday.length} ta tugatildi</span>
            </div>
          </div>

          {/* Metric 3: Ombor */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
            lowStockItems.length > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-[#10121a] border-white/[0.06]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Xomashyo & Omborxona</span>
              <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-[#181a24] text-slate-400'}`}>
                <Package className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-white tracking-tight tabular-nums">
                {inventory.length} <span className="text-xs font-normal text-slate-400">tur tovar</span>
              </div>
              {lowStockItems.length > 0 ? (
                <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{lowStockItems.length} ta mahsulot kritik chegarada!</span>
                </p>
              ) : (
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Ombor zaxirasi yetarli</span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
              <span>Pichoqcha: <strong className="text-slate-200">{inventory.find(i => i.id === 'inv-1')?.stock_quantity || 0} dona</strong></span>
              <span className="text-[11px] font-bold text-amber-400">Avto-sarf faol</span>
            </div>
          </div>
        </div>

        {/* 3. Barber Workstations Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-400" />
              <span>Ustalar Ishchi Stansiyalari</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Boshqarish uchun stansiyani tanlang</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {barbers.map(barber => {
              const currentWork = inProgressAppointments.find(a => a.barber_id === barber.id);
              const myQueue = waitingAppointments.filter(a => a.barber_id === barber.id);
              const barberService = services.find(s => s.id === currentWork?.service_id);
              const barberRevenue = transactions
                .filter(t => t.barber_id === barber.id)
                .reduce((acc, t) => acc + Number(t.amount), 0);

              return (
                <div 
                  key={barber.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                    currentWork 
                      ? 'bg-[#141620] border-amber-500/30 shadow-sm' 
                      : 'bg-[#10121a] border-white/[0.06]'
                  }`}
                >
                  <div>
                    {/* Barber Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                      <div>
                        <h3 className="font-bold text-sm text-white">{barber.full_name}</h3>
                        <span className="text-[11px] text-slate-400">{barber.phone}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                        currentWork 
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${currentWork ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                        <span>{currentWork ? 'Band' : 'Bo\'sh'}</span>
                      </span>
                    </div>

                    {/* Active Client Box */}
                    <div className="my-3 p-3.5 rounded-xl bg-[#0b0c10] border border-white/[0.04]">
                      {currentWork ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Ayni paytda:</span>
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {barberService?.duration_minutes || 20} daq
                            </span>
                          </div>
                          <div className="font-bold text-white text-sm">{currentWork.client_name}</div>
                          <div className="text-xs text-slate-400">{barberService?.name}</div>

                          <button
                            onClick={() => {
                              sound.play('cash');
                              setActivePaymentApt(currentWork);
                            }}
                            className="w-full mt-2.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Tugatish & Kassa ({currentWork.price.toLocaleString()} UZS)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2 text-xs text-slate-500 font-medium">
                          Stansiya bo'sh
                        </div>
                      )}
                    </div>

                    {/* Queue summary */}
                    <div className="space-y-1 text-xs">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                        <span>Navbatda: <strong className="text-white">{myQueue.length} kishi</strong></span>
                        <span>Tushum: <strong className="text-emerald-400">{barberRevenue.toLocaleString()} UZS</strong></span>
                      </div>
                      {myQueue.slice(0, 2).map((q, idx) => (
                        <div key={q.id} className="p-2 rounded-lg bg-[#0b0c10] flex items-center justify-between text-slate-300 text-[11px]">
                          <span>#{idx + 1} {q.client_name}</span>
                          <span className="text-slate-500">{services.find(s => s.id === q.service_id)?.name.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Switch to Barber View */}
                  <button
                    onClick={() => handleStationClick(barber.id)}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-[#181a24] hover:bg-[#202330] text-slate-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>Usta oynasiga o'tish</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Transactions Ledger & Inventory Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Transactions with Receipt Trigger */}
          <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Kassa Jurnali (So'nggi To'lovlar)</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Chekni ko'rish uchun bosing</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">To'lovlar tarixi bo'sh</p>
              ) : (
                transactions.map(tx => (
                  <div 
                    key={tx.id}
                    onClick={() => handleViewReceipt(tx)}
                    className="p-3.5 rounded-xl bg-[#0b0c10] border border-white/[0.04] hover:border-amber-500/40 cursor-pointer flex items-center justify-between text-xs transition-all group"
                  >
                    <div>
                      <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                        <span>{tx.client_name}</span>
                        <Receipt className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        <span>{profiles.find(p => p.id === tx.barber_id)?.full_name || 'Usta'}</span>
                        <span> • </span>
                        <span>{new Date(tx.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-emerald-400 text-sm tabular-nums">+{Number(tx.amount).toLocaleString()} UZS</div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#181a24] text-slate-300 mt-0.5 inline-block">
                        {tx.payment_type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inventory Control */}
          <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Xomashyo & Omborxona Nazorati</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Avtomatik yechiladi</span>
            </div>

            <div className="space-y-2.5">
              {inventory.map(item => {
                const isLow = item.stock_quantity <= item.min_alert_threshold;
                return (
                  <div key={item.id} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isLow ? 'bg-amber-950/20 border-amber-500/40' : 'bg-[#0b0c10] border-white/[0.04]'
                  }`}>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{item.item_name}</span>
                        {isLow && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            Kam qoldi
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Qoldiq: <strong className={isLow ? 'text-amber-400' : 'text-slate-200'}>{item.stock_quantity} {item.unit}</strong> (Minimal: {item.min_alert_threshold})
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestock(item.id)}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-[#181a24] hover:bg-[#202330] text-amber-400 border border-white/[0.08] hover:border-amber-500/50 transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+10 to'ldirish</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal 
        transaction={selectedTxForReceipt} 
        onClose={() => setSelectedTxForReceipt(null)} 
      />
    </>
  );
}
