import React, { useState } from 'react';
import { 
  Send, 
  X, 
  CheckCircle2, 
  Smartphone, 
  MessageSquare, 
  BellRing,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { sound } from '../utils/sound';

export default function TelegramDrawer({ isOpen, onClose }) {
  const [testSent, setTestSent] = useState(false);
  const [selectedType, setSelectedType] = useState('NEW_APPOINTMENT');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSendTestAlert = async () => {
    sound.play('click');
    setTestSent(true);

    try {
      await fetch('/api/telegram/test-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: {
            client_name: 'Komronbek (Jonli Test)',
            client_phone: '+998 90 123 45 67',
            barber_name: 'Anvar Usta',
            service_name: 'Kompleks Soch + Soqol',
            price: 85000,
            queue_number: 1,
            amount: 85000,
            payment_type: 'uzum',
            item_name: 'Bir martalik pichoqcha',
            stock_quantity: 3,
            unit: 'dona',
            min_alert_threshold: 5
          }
        })
      });
      sound.play('success');
    } catch (e) {
      console.warn('Telegram test failed:', e);
    }

    setTimeout(() => setTestSent(false), 3500);
  };

  const copyBotCommand = (cmd) => {
    sound.play('click');
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#10121a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Telegram Bot & Mini App</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Faol
                </span>
              </div>
              <p className="text-xs text-slate-400">Telegram orqali jonli navbat va avto-bildirishnomalar</p>
            </div>
          </div>
          <button
            onClick={() => { sound.play('click'); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#181a24] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Feature 1: Telegram WebApp Launch */}
          <div className="p-4 rounded-2xl bg-[#0b0c10] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Telegram Mini App (WebApp)</h4>
                <p className="text-xs text-slate-400">Mijozlar Telegram'dan chiqmasdan navbat oladi</p>
              </div>
            </div>
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              onClick={() => sound.play('click')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Ochish</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Feature 2: Live Bot Commands */}
          <div className="p-4 rounded-2xl bg-[#0b0c10] border border-white/[0.06] space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Mavjud Telegram Komandalar</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => copyBotCommand('/start')}
                className="p-2.5 rounded-xl bg-[#141620] border border-white/[0.06] hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-amber-300 font-mono">/start</div>
                  <div className="text-[11px] text-slate-400">Mini App & Menyuni ochish</div>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => copyBotCommand('/navbat')}
                className="p-2.5 rounded-xl bg-[#141620] border border-white/[0.06] hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-amber-300 font-mono">/navbat</div>
                  <div className="text-[11px] text-slate-400">Jonli kutish vaqtini ko'rish</div>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => copyBotCommand('/kassa')}
                className="p-2.5 rounded-xl bg-[#141620] border border-white/[0.06] hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-amber-300 font-mono">/kassa</div>
                  <div className="text-[11px] text-slate-400">Ega uchun kunlik tushum</div>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => copyBotCommand('/ustalar')}
                className="p-2.5 rounded-xl bg-[#141620] border border-white/[0.06] hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-amber-300 font-mono">/ustalar</div>
                  <div className="text-[11px] text-slate-400">Ustalar va narxlar</div>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-emerald-400 font-semibold text-center flex items-center justify-center gap-1">
                <Check className="w-3 h-3" /> Komanda nusxalandi!
              </p>
            )}
          </div>

          {/* Feature 3: Live Test Notification */}
          <div className="p-4 rounded-2xl bg-[#0b0c10] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span>Jonli Xabarnoma Sinash (Live Demo)</span>
              </h4>
              <span className="text-[10px] text-slate-500">Hakamlar oldida ko'rsatish</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'NEW_APPOINTMENT', label: 'Yangi Navbat' },
                { id: 'QUEUE_TURN', label: 'Navbat Yetib Keldi' },
                { id: 'PAYMENT_RECEIVED', label: 'To\'lov Qabul Qilindi' },
                { id: 'LOW_STOCK', label: 'Ombor Kam Qoldi' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => { sound.play('click'); setSelectedType(type.id); }}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                    selectedType === type.id
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-[#141620] border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSendTestAlert}
              disabled={testSent}
              className="w-full py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {testSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Xabarnoma yuborildi! (Server & Terminalda ko'rsatildi)</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Telegramga Test Xabarnoma Yuborish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
