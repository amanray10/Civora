import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge.jsx';

const TABS = ['Assigned', 'Accepted', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function DepartmentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [tab, setTab] = useState('Assigned');

  const load = () => api.get('/complaints').then((r) => setComplaints(r.data.complaints));

  useEffect(() => {
    load();
    const s = connectSocket();
    s?.on('complaint:new', load);
    s?.on('complaint:update', load);
    return () => { s?.off('complaint:new', load); s?.off('complaint:update', load); };
  }, []);

  const act = (id, status) => api.put(`/complaints/${id}/status`, { status }).then(load);

  const visible = complaints
    .filter((c) => c.status === tab)
    .sort((x, y) => (PRIORITY_ORDER[x.priority] ?? 9) - (PRIORITY_ORDER[y.priority] ?? 9));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Department queue</h1>
      <p className="text-sm text-slate-500">Complaints routed here by AI. Critical items float to the top.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = complaints.filter((c) => c.status === t).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition
                ${tab === t ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {t}{n > 0 && <span className="ml-1.5 text-xs opacity-70">({n})</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {visible.length === 0 && <div className="card p-10 text-center text-slate-500">Nothing in "{tab}" right now.</div>}
        {visible.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link to={`/complaints/${c.id}`} className="font-semibold hover:text-civic">#{c.id} · {c.title}</Link>
              <div className="flex items-center gap-2"><PriorityBadge priority={c.priority} /><StatusBadge status={c.status} /></div>
            </div>
            <p className="mt-1 text-sm text-slate-500">{c.summary || c.description?.slice(0, 140)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {c.user?.name} · {new Date(c.createdAt).toLocaleString()} {c.location ? `· ${c.location}` : ''}
              {c._count?.duplicates > 0 && ` · ${c._count.duplicates} duplicate report(s) merged`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.status === 'Assigned' && <>
                <button onClick={() => act(c.id, 'Accepted')} className="btn-ink py-1.5 text-xs">Accept</button>
                <button onClick={() => act(c.id, 'Rejected')} className="btn-ghost py-1.5 text-xs text-rose-600">Reject</button>
              </>}
              {c.status === 'Accepted' && <button onClick={() => act(c.id, 'In Progress')} className="btn-ink py-1.5 text-xs">Start work</button>}
              {c.status === 'In Progress' && <button onClick={() => act(c.id, 'Resolved')} className="btn-civic py-1.5 text-xs">Mark resolved</button>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
