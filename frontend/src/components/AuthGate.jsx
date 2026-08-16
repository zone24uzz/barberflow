import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Scissors, Smartphone, User, Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { sound } from '../utils/sound';

const MIN_PASSWORD_LENGTH = 4;

export default function AuthGate() {
  const { currentRole, login, register } = useAppStore();

  const [tab, setTab] = useState(currentRole === 'barber' ? 'barber' : 'client');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const isBarberTab = tab === 'barber';

  const switchTab = (nextTab) => {
    sound.play('toggle');
    setTab(nextTab);
    setError('');
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

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center">
          {isBarberTab ? <Scissors className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          {mode === 'login' ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}
        </h1>
        <p className="text-xs text-slate-400">
          {isBarberTab
            ? 'Usta sifatida kirib, o\'z navbatingizni boshqaring'
            : 'Mijoz sifatida kirib, jonli navbat oling'}
        </p>
      </div>

      {/* Role tabs */}
      <div className="p-1 rounded-2xl bg-[#10121a] border border-white/[0.06] flex gap-1">
        {[
          { id: 'barber', label: 'Usta', icon: Scissors },
          { id: 'client', label: 'Mijoz', icon: Smartphone }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              tab === id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* The tab only picks the role for registration. Login is credential-only:
          the account's stored role wins, so a wrong tab is never a dead end. */}
      {mode === 'login' && (
        <p className="text-[11px] text-slate-500 text-center px-2">
          Kirishda tab muhim emas — hisobingiz roli avtomatik aniqlanadi
        </p>
      )}

      <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Ismingiz</span>
            </label>
            <input
              type="text"
              required
              placeholder={isBarberTab ? 'Masalan: Anvar Usta' : 'Masalan: Sardorbek'}
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
            placeholder="+998 90 123 45 67"
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
              <span>{mode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="w-full text-xs text-slate-400 hover:text-amber-400 transition-colors font-semibold"
        >
          {mode === 'login'
            ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting"
            : 'Hisobingiz bormi? Kirish'}
        </button>
      </form>
    </div>
  );
}
