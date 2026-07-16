import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';

export default function DeptAdminDashboard() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/dept-admin/users').then((r) => setUsers(r.data.users));
  useEffect(() => { load(); }, []);

  const addOfficer = (e) => {
    e.preventDefault();
    setError('');
    api.post('/dept-admin/officers', { email: email.trim() })
      .then(() => { setEmail(''); load(); })
      .catch((err) => setError(err.response?.data?.error || 'Could not add officer.'));
  };

  const demote = (id) => api.put(`/dept-admin/officers/${id}/demote`).then(load);
  const deactivate = (id) => api.put(`/dept-admin/users/${id}/deactivate`).then(load);
  const reactivate = (id) => api.put(`/dept-admin/users/${id}/reactivate`).then(load);

  const officers = users.filter((u) => u.role === 'department');
  const citizens = users.filter((u) => u.role === 'citizen');

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Department administration</h1>
        <Link to="/department" className="btn-ink">View requests queue</Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">Manage the officers and citizens tied to your department.</p>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Department officers</h2>
      <form onSubmit={addOfficer} className="mb-4 flex flex-wrap gap-2">
        <input
          type="email" required placeholder="officer@email.com" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input max-w-xs"
        />
        <button type="submit" className="btn-ink py-1.5 text-sm">Add officer</button>
      </form>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {officers.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No officers yet.</td></tr>}
            {officers.map((u) => (
              <tr key={u.id} className={`border-t border-slate-100 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">{u.isActive ? <span className="text-emerald-600">Active</span> : <span className="text-rose-500">Deactivated</span>}</td>
                <td className="px-4 py-3 space-x-2">
                  {u.isActive
                    ? <button onClick={() => deactivate(u.id)} className="btn-ghost py-1 text-xs text-rose-600">Deactivate</button>
                    : <button onClick={() => reactivate(u.id)} className="btn-ghost py-1 text-xs text-emerald-600">Reactivate</button>}
                  <button onClick={() => demote(u.id)} className="btn-ghost py-1 text-xs">Demote</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Citizens</h2>
      <p className="mb-3 text-sm text-slate-500">Citizens who have filed a request handled by your department.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {citizens.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No citizen requests yet.</td></tr>}
            {citizens.map((u) => (
              <tr key={u.id} className={`border-t border-slate-100 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">{u.isActive ? <span className="text-emerald-600">Active</span> : <span className="text-rose-500">Deactivated</span>}</td>
                <td className="px-4 py-3">
                  {u.id === me.id ? null : u.isActive
                    ? <button onClick={() => deactivate(u.id)} className="btn-ghost py-1 text-xs text-rose-600">Deactivate</button>
                    : <button onClick={() => reactivate(u.id)} className="btn-ghost py-1 text-xs text-emerald-600">Reactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
