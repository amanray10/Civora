import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge.jsx';

const STATUSES = ['', 'Submitted', 'AI Processing', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Rejected', 'Closed'];

export default function ComplaintHistory() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const t = setTimeout(() =>
      api.get('/complaints', { params: { search: search || undefined, status: status || undefined } })
        .then((r) => setComplaints(r.data.complaints)), 250);
    return () => clearTimeout(t);
  }, [search, status]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">{user.role === 'citizen' ? 'My complaints' : 'All complaints'}</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <FiSearch className="absolute left-3 top-3 text-slate-400" />
          <input className="input pl-9" placeholder="Search title, description or location…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Title</th>
              {user.role !== 'citizen' && <th className="px-4 py-3">Citizen</th>}
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Filed</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-civic-tint/40">
                <td className="px-4 py-3 text-slate-500">{c.id}</td>
                <td className="px-4 py-3">
                  <Link to={`/complaints/${c.id}`} className="font-medium text-ink hover:text-civic">{c.title}</Link>
                  {c._count?.duplicates > 0 && (
                    <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs text-white">+{c._count.duplicates} merged</span>
                  )}
                </td>
                {user.role !== 'citizen' && <td className="px-4 py-3 text-slate-500">{c.user?.name}</td>}
                <td className="px-4 py-3 text-slate-500">{c.department?.departmentName || '—'}</td>
                <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {complaints.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No complaints match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
