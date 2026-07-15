import { useEffect, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import api from '../services/api';

const SUGGESTIONS = [
  'How do I register a complaint?',
  'How long does resolution usually take?',
  'What does the "Assigned" status mean?',
  'Can I attach photos to my complaint?'
];

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);

  useEffect(() => {
    api.get('/chat/history').then((r) =>
      setMessages(r.data.chats.flatMap((c) => [{ role: 'user', text: c.question }, { role: 'bot', text: c.answer }]))
    );
  }, []);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const { data } = await api.post('/chat', { question: q });
      setMessages((m) => [...m, { role: 'bot', text: data.chat.answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'The assistant is unavailable right now. Try again in a moment.' }]);
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto flex h-[calc(100vh-61px)] max-w-3xl flex-col px-4 py-6">
      <h1 className="font-display text-2xl font-bold">Grievance assistant</h1>
      <p className="mb-4 text-sm text-slate-500">Ask anything about filing or tracking complaints. Powered by a local AI model.</p>

      <div className="card flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-slate-500">Try one of these to get started:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="btn-ghost text-xs">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed
              ${m.role === 'user' ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-slate-100'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-slate-400">Assistant is typing…</p>}
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input className="input flex-1" placeholder="Type your question…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-civic" disabled={busy}><FiSend /></button>
      </form>
    </main>
  );
}
