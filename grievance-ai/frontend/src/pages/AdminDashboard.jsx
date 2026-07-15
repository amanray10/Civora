import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import api from '../services/api';

const COLORS = ['#0F2A43', '#E8871E', '#27496B', '#C96F0C', '#5B7A9D', '#F2B366', '#8FA8C2', '#7A5230'];

export default function AdminDashboard() {
  const [a, setA] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const load = () => {
    api.get('/admin/analytics').then((r) => setA(r.data));
    api.get('/admin/users').then((r) => setUsers(r.data.users));
    api.get('/departments').then((r) => setDepartments(r.data.departments));
  };
  useEffect(load, []);

  const setRole = (id, role, departmentId) =>
    api.put(`/admin/users/${id}/role`, { role, departmentId }).then(load);

  if (!a) return <main className="p-8 text-center text-slate-500">Loading analytics…</main>;

  const Stat = ({ label, value, accent }) => (
    <div className="card p-5">
      <p className={`font-display text-3xl font-extrabold ${accent || ''}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">City-wide overview</h1>
        <Link to="/complaints" className="btn-ink">Browse all complaints</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total complaints" value={a.total} />
        <Stat label="Resolved or closed" value={a.resolved} accent="text-emerald-600" />
        <Stat label="Resolution rate" value={a.resolutionRate + '%'} accent="text-civic-dark" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <p className="mb-3 font-display font-bold">Complaints — last 14 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={a.trend}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8871E" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#E8871E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#E8871E" fill="url(#g)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="mb-3 font-display font-bold">By status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={a.byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {a.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {a.byStatus.map((s, i) => (
              <span key={s.name}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{s.name} ({s.value})</span>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="mb-3 font-display font-bold">By department</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.byDepartment} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0F2A43" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="mb-3 font-display font-bold">By priority</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.byPriority}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Bar dataKey="value" fill="#E8871E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User & role management */}
      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Users & roles</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select className="input py-1.5" value={u.role} onChange={(e) => setRole(u.id, e.target.value, u.departmentId)}>
                    <option value="citizen">citizen</option>
                    <option value="department">department</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.role === 'department' ? (
                    <select className="input py-1.5" value={u.departmentId || ''} onChange={(e) => setRole(u.id, 'department', e.target.value)}>
                      <option value="">Select…</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                    </select>
                  ) : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
