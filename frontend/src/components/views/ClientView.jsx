import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  Smartphone, 
  Search, 
  Clock, 
  Scissors, 
  CheckCircle, 
  User, 
  Phone, 
  ArrowRight
} from 'lucide-react';
import { sound } from '../../utils/sound';

export default function ClientView() {
  const { 
    profiles, 
    services, 
    appointments, 
    addAppointment 
  } = useAppStore();

  const barbers = profiles.filter(p => p.role === 'barber');

  const [searchPhone, setSearchPhone] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState(barbers[0]?.id || 'barber-1');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || 'srv-1');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Search existing appointment by phone or name
  const searchResults = searchPhone.trim()
    ? appointments.filter(a => 
        (a.status === 'waiting' || a.status === 'in_progress') &&
        (a.client_phone?.includes(searchPhone.trim()) || a.client_name?.toLowerCase().includes(searchPhone.trim().toLowerCase()))
      )
    : [];

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    sound.play('success');
    const newApt = await addAppointment({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || '+998 90 123 45 67',
      barber_id: selectedBarberId,
      service_id: selectedServiceId
    });

    setBookingSuccess(newApt);
    setClientName('');
    setClientPhone('');
  };

  const selectedBarber = barbers.find(b => b.id === selectedBarberId);
  const selectedService = services.find(s => s.id === selectedServiceId);
  
  // Calculate wait time for the selected barber
  const barberWaitingCount = appointments.filter(
    a => a.barber_id === selectedBarberId && (a.status === 'waiting' || a.status === 'in_progress')
  ).length;
  const estimatedWaitMinutes = Math.max(10, barberWaitingCount * 20);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-3xl bg-[#10121a] border border-white/[0.08] text-center space-y-2 relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center mb-1">
          <Smartphone className="w-5 h-5" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Jonli Navbat Xizmati
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Sartaroshxonada bekorga kutmasdan, uydan yoki yo'ldan turib jonli navbat oling va holatni kuzating.
        </p>
      </div>

      {/* 2. Track Existing Ticket / Search */}
      <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Search className="w-4 h-4 text-amber-400" />
          <span>Mening navbatimni tekshirish</span>
        </label>

        <div className="relative">
          <input
            type="text"
            placeholder="Ismingiz yoki telefon raqamingiz..."
            value={searchPhone}
            onChange={(e) => {
              sound.play('click');
              setSearchPhone(e.target.value);
            }}
            className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500 shadow-inner"
          />
        </div>

        {/* Search Results */}
        {searchPhone.trim() && (
          <div className="mt-3 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                Ushbu ma'lumot bo'yicha faol navbat topilmadi
              </p>
            ) : (
              searchResults.map(apt => {
                const b = barbers.find(x => x.id === apt.barber_id);
                const s = services.find(x => x.id === apt.service_id);
                const isCurrent = apt.status === 'in_progress';

                return (
                  <div 
                    key={apt.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent 
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm' 
                        : 'bg-[#0b0c10] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1.5 ${
                        isCurrent 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                        <span>{isCurrent ? 'Ayni paytda kresloda' : `Navbatda: #${apt.queue_number}`}</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {b?.full_name}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-base">{apt.client_name}</div>
                        <div className="text-xs text-slate-400">{s?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isCurrent ? 'Tugashiga oz qoldi' : `~${apt.queue_number * 15} daqiqa`}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-200 mt-0.5 tabular-nums">{apt.price.toLocaleString()} UZS</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 3. Booking Success Alert */}
      {bookingSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 space-y-2 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Navbat Muvaffaqiyatli Olindi!</span>
          </div>
          <p className="text-xs">
            Hurmatli <strong>{bookingSuccess.client_name}</strong>, siz <strong>{selectedBarber?.full_name}</strong> qabuliga <strong>#{bookingSuccess.queue_number}</strong>-navbatdasiz.
          </p>
          <div className="text-xs font-bold text-emerald-300 bg-black/40 p-2.5 rounded-xl flex items-center justify-between">
            <span>Taxminiy kutish vaqti:</span>
            <span>~{estimatedWaitMinutes} daqiqa</span>
          </div>
        </div>
      )}

      {/* 4. Live Barbers Radar */}
      <div className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-400" />
          <span>Ustalar Bandlik Holati (Radar)</span>
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {barbers.map(barber => {
            const count = appointments.filter(
              a => a.barber_id === barber.id && (a.status === 'waiting' || a.status === 'in_progress')
            ).length;
            const isSelected = selectedBarberId === barber.id;

            return (
              <button
                key={barber.id}
                type="button"
                onClick={() => {
                  sound.play('click');
                  setSelectedBarberId(barber.id);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#181a24] border-amber-500 text-white font-bold ring-1 ring-amber-500 shadow-sm'
                    : 'bg-[#0b0c10] border-white/[0.04] text-slate-400 hover:border-white/[0.08]'
                }`}
              >
                <div className="font-bold text-xs text-white truncate">{barber.full_name.split(' ')[0]}</div>
                <div className="text-[11px] text-amber-400 font-semibold mt-1">
                  {count} kishi navbatda
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Online Queue Booking Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
        <div className="pb-2 border-b border-white/[0.04]">
          <h3 className="font-bold text-sm text-white">Yangi Navbat Olish</h3>
          <p className="text-[11px] text-slate-400">Ro'yxatdan o'tish shart emas, faqat ism va telefon raqam</p>
        </div>

        <form onSubmit={handleBooking} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Ismingiz</span>
            </label>
            <input
              type="text"
              required
              placeholder="Masalan: Sardorbek"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Telefon raqamingiz</span>
            </label>
            <input
              type="tel"
              required
              placeholder="+998 90 123 45 67"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Xizmat turi
            </label>
            <div className="space-y-1.5">
              {services.map(srv => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <label
                    key={srv.id}
                    onClick={() => {
                      sound.play('click');
                      setSelectedServiceId(srv.id);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-white font-bold'
                        : 'bg-[#0b0c10] border-white/[0.04] text-slate-400 hover:border-white/[0.08]'
                    }`}
                  >
                    <span>{srv.name} ({srv.duration_minutes} daq)</span>
                    <span className="text-amber-400 font-extrabold tabular-nums">{srv.price.toLocaleString()} UZS</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Navbatni Tasdiqlash ({selectedService?.price.toLocaleString()} UZS)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
