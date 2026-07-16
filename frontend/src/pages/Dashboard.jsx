import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlusCircle, FiClock, FiCheckCircle, FiInbox } from 'react-icons/fi';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import { useAuth } from '../hooks/useAuth.jsx';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);

  const load = () => api.get('/complaints').then((r) => setComplaints(r.data.complaints));

  useEffect(() => {
    load();
    const s = connectSocket();
    s?.on('complaint:update', load);
    return () => s?.off('complaint:update', load);
  }, []);

  const open = complaints.filter((c) => !['Resolved', 'Closed', 'Rejected'].includes(c.status));
  const resolved = complaints.filter((c) => ['Resolved', 'Closed'].includes(c.status));

  const Stat = ({ icon: Icon, label, value, tone }) => (
    <div className="card flex items-center gap-4 p-5">
      <span className={`rounded-xl p-3 ${tone}`}><Icon size={20} /></span>
      <div>
        <p className="font-display text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Hello, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">Track your grievances and their live status.</p>
        </div>
        <Link to="/complaints/new" className="btn-civic"><FiPlusCircle /> New complaint</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={FiInbox} label="Total complaints" value={complaints.length} tone="bg-ink/10 text-ink" />
        <Stat icon={FiClock} label="Open" value={open.length} tone="bg-civic-tint text-civic-dark" />
        <Stat icon={FiCheckCircle} label="Resolved" value={resolved.length} tone="bg-emerald-100 text-emerald-700" />
      </div>

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Recent complaints</h2>
      {complaints.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No complaints yet. Spotted a civic issue? <Link className="text-civic underline" to="/complaints/new">Report it now</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.slice(0, 6).map((c) => (
            <Link key={c.id} to={`/complaints/${c.id}`} className="card block p-4 transition hover:border-civic">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">#{c.id} · {c.title}</p>
                <div className="flex items-center gap-2"><PriorityBadge priority={c.priority} /><StatusBadge status={c.status} /></div>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {c.department?.departmentName || 'Routing…'} · {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
