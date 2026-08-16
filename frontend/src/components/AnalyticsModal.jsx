import React from 'react';
import { X, TrendingUp, Users, Clock, Award, BarChart3, Scissors, Percent, DollarSign } from 'lucide-react';
import { sound } from '../utils/sound';
import { useAppStore } from '../store/useAppStore';

export default function AnalyticsModal({ isOpen, onClose }) {
  const { profiles, services, appointments, transactions } = useAppStore();

  if (!isOpen) return null;

  const totalRevenue = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
  const barbers = profiles.filter(p => p.role === 'barber');

  // Calculate metrics per barber
  const barberMetrics = barbers.map(barber => {
    const bTxs = transactions.filter(t => t.barber_id === barber.id);
    const bTotal = bTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const bCompleted = appointments.filter(a => a.barber_id === barber.id && a.status === 'completed').length;
    const bNoShow = appointments.filter(a => a.barber_id === barber.id && a.status === 'no_show').length;

    return {
      ...barber,
      totalRevenue: bTotal,
      myShare: bTotal * 0.5,
      completedCount: bCompleted,
      noShowCount: bNoShow,
      satisfaction: 98
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-100 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Sartaroshxona Biznes Analitikasi</h2>
              <p className="text-xs text-slate-400">Ustalar samaradorligi va moliyaviy oqimlar hisoboti</p>
            </div>
          </div>
          <button
            onClick={() => { sound.play('click'); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Jami Yalpi Daromad</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 tabular-nums">
              {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">so'm</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">O'rtacha Chek</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums">
              {transactions.length > 0 ? Math.round(totalRevenue / transactions.length).toLocaleString() : 0} <span className="text-xs font-normal text-slate-400">so'm</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Xizmat Qilinganlar</span>
            <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1 tabular-nums">
              {appointments.filter(a => a.status === 'completed').length} <span className="text-xs font-normal text-slate-400">mijoz</span>
            </div>
          </div>
        </div>

        {/* Barber Efficiency Leaderboard */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Ustalar Samaradorlik Reytingi</span>
          </h3>

          <div className="space-y-3">
            {barberMetrics.map((b, idx) => (
              <div key={b.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-300 font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{b.full_name}</h4>
                      <span className="text-[11px] text-slate-400">{b.completedCount} ta mijoz qabul qildi</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-400 text-sm tabular-nums">
                      {b.totalRevenue.toLocaleString()} so'm
                    </div>
                    <span className="text-[11px] text-slate-400">50% ulush: {b.myShare.toLocaleString()} so'm</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalRevenue > 0 ? Math.min(100, (b.totalRevenue / totalRevenue) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
