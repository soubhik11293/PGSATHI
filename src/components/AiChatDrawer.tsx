import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sparkles, X, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export const AiChatDrawer: React.FC = () => {
  const { aiChatOpen, setAiChatOpen, currentUser } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: `Namaste ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! I'm your PG Saathi AI Buddy. Ask me about your active orders, cancellation policies, emergency repairs, or dinner recommendations!`,
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!aiChatOpen) return null;

  const handleSend = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const messageToSend = preset || input;
    if (!messageToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!preset) setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const res = await api.askSupportChat(messageToSend, history, currentUser?.id || 'usr-student-aarav');
      
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: res.reply || "I'm here to help with all your PG essentials!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: "I'm having a brief connection hitch, but you can always track your bookings in the 'My Bookings' tab or contact our operations team.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Where is my active food order?",
    "How do I cancel my booking?",
    "Find dinner under ₹100",
    "I need an electrician urgently."
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col border-l border-zinc-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Saathi AI Companion</h3>
            <p className="text-[11px] text-amber-100">Grounded in your real orders & PG data</p>
          </div>
        </div>
        <button
          onClick={() => setAiChatOpen(false)}
          className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/60">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3 text-xs ${
                msg.sender === 'user'
                  ? 'bg-zinc-900 text-white rounded-br-xs'
                  : 'bg-white text-zinc-800 border border-zinc-200/80 shadow-xs rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div
                className={`text-[9px] mt-1 text-right ${
                  msg.sender === 'user' ? 'text-zinc-400' : 'text-zinc-400'
                }`}
              >
                {msg.time}
              </div>
            </div>
            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-zinc-700 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center text-zinc-400 text-xs pl-9">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>Saathi is checking your account data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips */}
      <div className="p-2 bg-white border-t border-zinc-100 flex gap-1.5 overflow-x-auto">
        {sampleQuestions.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(undefined, sq)}
            className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-amber-50 text-zinc-700 hover:text-amber-800 border border-zinc-200 transition-colors shrink-0"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={(e) => handleSend(e)} className="p-3 bg-white border-t border-zinc-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Saathi anything about your PG..."
          className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
