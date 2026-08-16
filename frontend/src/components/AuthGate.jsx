import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Scissors, 
  Smartphone, 
  Shield, 
  User, 
  Phone, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { sound } from '../utils/sound';

const MIN_PASSWORD_LENGTH = 4;

export default function AuthGate({ initialRole }) {
  const { currentRole, setCurrentRole, login, register, loginAsDemo } = useAppStore();

  const [tab, setTab] = useState(initialRole || currentRole || 'owner');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (initialRole) {
      setTab(initialRole);
    }
  }, [initialRole]);

  // When switching to owner, owner only has login (no public registration)
  const isOwnerTab = tab === 'owner';
  const isBarberTab = tab === 'barber';
  const isClientTab = tab === 'client';

  const switchTab = (nextTab) => {
    sound.play('toggle');
    setTab(nextTab);
    setError('');
    if (nextTab === 'owner' && mode === 'register') {
      setMode('login');
    }
  };

  const switchMode = (nextMode) => {
    sound.play('click');
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lsin`);
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      setError('Ismingizni kiriting');
      return;
    }

    setIsBusy(true);
    const result = mode === 'login'
      ? await login(phone.trim(), password)
      : await register({ full_name: fullName.trim(), phone: phone.trim(), password, role: tab });
    setIsBusy(false);

    if (result.ok) {
      sound.play('success');
      setPassword('');
    } else {
      setError(result.error);
    }
  };

  const handleQuickDemoLogin = async (demoRole) => {
    sound.play('success');
    setIsBusy(true);
    await loginAsDemo(demoRole);
    setIsBusy(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      {/* Back button to Client Portal */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            sound.play('toggle');
            setCurrentRole('client');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Mijoz Navbatiga Qaytish</span>
        </button>

        <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
          Alohida Himoyalangan Panel
        </span>
      </div>

      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center">
          {isOwnerTab && <Shield className="w-6 h-6" />}
          {isBarberTab && <Scissors className="w-6 h-6" />}
          {isClientTab && <Smartphone className="w-6 h-6" />}
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          {isOwnerTab && "Boshqaruv (Ega) Paneli"}
          {isBarberTab && "Usta Ishchi Kabineti"}
          {isClientTab && "Mijoz Shaxsiy Portali"}
        </h1>
        <p className="text-xs text-slate-400">
          {isOwnerTab && "Sartaroshxona kassasi, analitika va xomashyo omborini boshqarish"}
          {isBarberTab && "Faqat o'z navbatingizni boshqarish va shaxsiy 50% daromadni kuzatish"}
          {isClientTab && "Jonli navbat olish va o'z navbat chiptangizni kuzatish"}
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="p-1 rounded-2xl bg-[#10121a] border border-white/[0.06] flex gap-1">
        {[
          { id: 'owner', label: 'Ega / Admin', icon: Shield },
          { id: 'barber', label: 'Usta', icon: Scissors },
          { id: 'client', label: 'Mijoz', icon: Smartphone }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex-1 py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              tab === id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Quick 1-Click Demo Login Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Klikda Demo Kirish</span>
          </span>
          <span className="text-[10px] text-slate-400">Sinov / Demo uchun</span>
        </div>

        <button
          type="button"
          onClick={() => handleQuickDemoLogin(tab)}
          className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <span>
            {isOwnerTab && "👑 Jasur Xidoyatov (Ega) sifatida kirish"}
            {isBarberTab && "💈 Anvar Usta (Usta) sifatida kirish"}
            {isClientTab && "🙂 Otabek Mirzayev (Mijoz) sifatida kirish"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <span className="text-xs font-bold text-slate-300">
            {mode === 'login' ? "Hisob orqali kirish" : "Yangi hisob ochish"}
          </span>
          {isOwnerTab && (
            <span className="text-[10px] text-slate-500">Parol: admin123</span>
          )}
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Ismingiz</span>
            </label>
            <input
              type="text"
              required
              placeholder={isBarberTab ? 'Masalan: Bekzod Usta' : 'Masalan: Sardorbek'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Telefon raqamingiz</span>
          </label>
          <input
            type="tel"
            required
            placeholder={isOwnerTab ? "+998 90 123 45 67" : "+998 90 123 45 67"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Parol</span>
          </label>
          <input
            type="password"
            required
            placeholder="Kamida 4 ta belgi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{mode === 'login' ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {!isOwnerTab && (
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-xs text-slate-400 hover:text-amber-400 transition-colors font-semibold pt-1"
          >
            {mode === 'login'
              ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting"
              : 'Hisobingiz bormi? Kirish'}
          </button>
        )}
      </form>
    </div>
  );
}
