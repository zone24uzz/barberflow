import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { X, UserPlus, Scissors, Phone, User, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/sound';

export default function WalkInModal() {
  const { isWalkInModalOpen, setIsWalkInModalOpen, profiles, services, addAppointment, currentUser } = useAppStore();

  const barbers = profiles.filter(p => p.role === 'barber');

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState(currentUser?.id || barbers[0]?.id || 'barber-1');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || 'srv-1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isWalkInModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    sound.play('success');
    setIsSubmitting(true);
    await addAppointment({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || '+998 90 000 00 00',
      barber_id: selectedBarberId,
      service_id: selectedServiceId
    });

    setIsSubmitting(false);
    setClientName('');
    setClientPhone('');
    setIsWalkInModalOpen(false);
  };

  const currentService = services.find(s => s.id === selectedServiceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#10121a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Tezkor Mijoz Kiritish</h3>
              <p className="text-xs text-slate-400">Jonli navbatga yangi mijoz qo'shish</p>
            </div>
          </div>
          <button
            onClick={() => { sound.play('click'); setIsWalkInModalOpen(false); }}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#181a24] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Client Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Mijoz ismi *</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Masalan: Sardor"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Client Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Telefon raqami (ixtiyoriy)</span>
            </label>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Barber Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Usta tanlang</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {barbers.map(barber => (
                <button
                  type="button"
                  key={barber.id}
                  onClick={() => { sound.play('click'); setSelectedBarberId(barber.id); }}
                  className={`p-3 rounded-xl border text-left transition-all text-xs active:scale-95 ${
                    selectedBarberId === barber.id
                      ? 'bg-[#181a24] border-amber-500 text-white font-bold ring-1 ring-amber-500 shadow-sm'
                      : 'bg-[#0b0c10] border-white/[0.04] text-slate-400 hover:border-white/[0.08]'
                  }`}
                >
                  <div className="truncate font-bold">{barber.full_name.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-500">{barber.phone?.slice(-4)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Xizmat turi
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {services.map(srv => (
                <label
                  key={srv.id}
                  onClick={() => { sound.play('click'); setSelectedServiceId(srv.id); }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                    selectedServiceId === srv.id
                      ? 'bg-amber-950/40 border-amber-500 text-white font-bold'
                      : 'bg-[#0b0c10] border-white/[0.04] text-slate-400 hover:border-white/[0.08]'
                  }`}
                >
                  <span>{srv.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{srv.duration_minutes} daq</span>
                    <span className="font-extrabold text-amber-400 tabular-nums">{srv.price.toLocaleString()} UZS</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Navbatga Kiritish ({currentService?.price.toLocaleString()} UZS)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
