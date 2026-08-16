import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  X, 
  Bot, 
  User, 
  Loader2, 
  Trash2, 
  HelpCircle, 
  Scissors, 
  Shield
} from 'lucide-react';
import { sound } from '../utils/sound';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function BarberFlowAIAssistant({ isOpen, onClose }) {
  const { currentRole, currentUser } = useAppStore();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isOwner = currentRole === 'owner';
  const isBarber = currentRole === 'barber';
  const isClient = currentRole === 'client';

  // Initial welcome message per role
  useEffect(() => {
    if (messages.length === 0) {
      if (isOwner) {
        setMessages([
          {
            id: 'init-owner',
            sender: 'ai',
            text: `👑 **Assalomu alaykum, Hurmatli Boshqaruvchi!**\n\nMen **BarberFlow Executive AI Biznes Analitigi**man. Kassa tushumlari, to'lov turlari (Naqd, Karta, Uzum), ustalar samaradorligi va ombor zaxiralari bo'yicha tahlil bera olaman.\n\nQanday hisobot yoki maslahat kerak?`,
            timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (isBarber) {
        setMessages([
          {
            id: 'init-barber',
            sender: 'ai',
            text: `💈 **Salom, Usta!**\n\nMen sizning shaxsiy **Usta Co-Pilot AI** yordamchingizman. Navbatingizdagi mijozlar, bugungi 50% ulushingiz yoki soch/soqol olish texnikalari bo'yicha savollaringizga javob beraman!`,
            timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages([
          {
            id: 'init-client',
            sender: 'ai',
            text: `✨ **Assalomu alaykum!**\n\nMen **BarberFlow AI Stilist va Soch Maslahatchisi**man. Menga yuzingiz rasmini yuklashingiz yoki yuz shaklingizni aytishingiz mumkin — men sizga eng mos zamonaviy soch va soqol turmaklarini tavsiya qilaman!`,
            timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }
  }, [currentRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Quick Prompt Suggestions per Role
  const promptSuggestions = isOwner
    ? [
        "📊 Bugungi kassa va tushum tahlili qanday?",
        "👑 Ustalar samaradorligi va yetakchi usta kim?",
        "⚠️ Omborda qaysi mahsulotlar tugayapti?",
        "💡 Sartaroshxona tushumini oshirish bo'yicha tavsiyalar"
      ]
    : isBarber
    ? [
        "⏳ Navbatimda kimlar kutmoqda va qancha vaqt bor?",
        "💰 Bugungi 50% shaxsiy daromadim qancha?",
        "✂️ Fade soch kesishda toza o'tish (blend) usullari",
        "🧔 Soqol shakllantirish bo'yicha tavsiyalar"
      ]
    : [
        "📸 Rasmimga qarab mos soch turmagi tavsiya qiling",
        "💈 Dumaloq yuz shakliga qanday soch turmagi yarashadi?",
        "✂️ 2026-yilning eng trend soch turmaklari qaysilar?",
        "🧴 Quruq va to'kiluvchan sochlarni parvarishlash"
      ];

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.play('click');
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const query = textToSend.trim();
    if (!query && !selectedImage) return;

    sound.play('click');

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query || (selectedImage ? "Ushbu rasmimni tahlil qilib, mos soch turmagini tavsiya qiling." : ""),
      image: selectedImage,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    const imagePayload = selectedImage;
    setSelectedImage(null);
    setIsThinking(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: currentRole,
          prompt: query || "Ushbu rasmga qarab eng mos soch turmagini tavsiya eting.",
          image: imagePayload,
          userContext: currentUser || {}
        })
      });

      const data = await res.json();
      setIsThinking(false);
      sound.play('success');

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.reply || "Kechirasiz, javob olishda xatolik bo'ldi.",
          source: data.source,
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      setIsThinking(false);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: "Serverga ulanishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleClearHistory = () => {
    sound.play('toggle');
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0e1017] border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[750px] overflow-hidden text-slate-100 relative">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#12141e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 p-[1px]">
              <div className="w-full h-full bg-[#0c0d12] rounded-[15px] flex items-center justify-center">
                {isOwner && <Shield className="w-5 h-5 text-amber-400" />}
                {isBarber && <Scissors className="w-5 h-5 text-amber-400" />}
                {isClient && <Sparkles className="w-5 h-5 text-amber-400" />}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {isOwner && "Executive AI Biznes Analitik"}
                  {isBarber && "Usta Co-Pilot AI Yordamchisi"}
                  {isClient && "BarberFlow AI Stilist & Maslahatchi"}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isOwner && "Kassa, ombor va ustalar hisoboti bo'yicha tahlillar"}
                {isBarber && "Navbatlar, 50% daromad va sartaroshlik texnikalari"}
                {isClient && "Rasm tahlili va yuz shaklingizga mos soch turmaklari"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Chatni tozalash"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1c1f2b] rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { sound.play('click'); onClose(); }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1c1f2b] rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[78%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.image && (
                  <div className="rounded-2xl overflow-hidden border border-white/[0.08] max-w-xs shadow-md">
                    <img src={msg.image} alt="Yuklangan rasm" className="w-full h-auto object-cover max-h-52" />
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm shadow-md'
                      : 'bg-[#141620] border border-white/[0.06] text-slate-100 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>

                <div className={`text-[10px] text-slate-500 flex items-center gap-2 px-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.timestamp}</span>
                  {msg.source === 'gemini' && (
                    <span className="text-amber-400 font-semibold">• Multimodal AI</span>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[#1c1f2b] border border-white/[0.08] flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#141620] border border-white/[0.06] flex items-center gap-2 text-xs text-amber-300 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>AI tahlil qilmoqda va javob tayyorlamoqda...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-[#0c0d12] border-t border-white/[0.04] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>Takliflar:</span>
          </span>
          {promptSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(suggestion)}
              className="text-xs shrink-0 px-3 py-1.5 rounded-xl bg-[#141620] hover:bg-[#1e2230] text-slate-300 hover:text-amber-300 border border-white/[0.06] transition-all active:scale-95"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Image Preview before sending */}
        {selectedImage && (
          <div className="p-3 bg-[#12141e] border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={selectedImage} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-amber-500/40" />
              <div>
                <span className="text-xs font-bold text-white">Rasm biriktirildi</span>
                <p className="text-[11px] text-slate-400">Gemini 3.7 Flash yuz va soch turmagini tahlil qiladi</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1.5 rounded-lg bg-[#1a1d29] hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="p-3 sm:p-4 bg-[#12141e] border-t border-white/[0.06]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Photo Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Yuzingiz rasmini yuklash (Soch turmagini tahlil qilish)"
              className="p-3 rounded-xl bg-[#181a24] hover:bg-[#202330] text-amber-400 border border-white/[0.08] hover:border-amber-500/40 transition-all active:scale-95 shrink-0 flex items-center justify-center"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={
                isOwner
                  ? "Kassa, ombor yoki biznes tahlili bo'yicha so'rang..."
                  : isBarber
                  ? "Navbatingiz, daromad yoki texnika haqida so'rang..."
                  : "Soch turmagi haqida so'rang yoki rasm yuklang..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#0b0c10] border border-white/[0.08] focus:border-amber-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isThinking || (!inputText.trim() && !selectedImage)}
              className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center"
            >
              {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
