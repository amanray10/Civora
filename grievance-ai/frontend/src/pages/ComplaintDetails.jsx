import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiMapPin, FiPaperclip, FiCpu } from 'react-icons/fi';
import api, { fileUrl } from '../services/api';
import { connectSocket } from '../services/socket';
import { useAuth } from '../hooks/useAuth.jsx';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';

export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [departments, setDepartments] = useState([]);

  const load = () =>
    api.get(`/complaints/${id}`).then((r) => setC(r.data.complaint))
      .catch((e) => setError(e.response?.data?.error || 'Could not load the complaint.'));

  useEffect(() => {
    load();
    if (user.role === 'admin') api.get('/departments').then((r) => setDepartments(r.data.departments));
    const s = connectSocket();
    const onUpdate = (msg) => { if (Number(msg.id) === Number(id)) load(); };
    s?.on('complaint:update', onUpdate);
    const poll = setInterval(() => { if (c?.status === 'AI Processing') load(); }, 3000);
    return () => { s?.off('complaint:update', onUpdate); clearInterval(poll); };
  }, [id, c?.status]);

  const setStatus = (status) =>
    api.put(`/complaints/${id}/status`, { status, note }).then(() => { setNote(''); load(); });

  const reassign = (departmentId) =>
    api.put(`/complaints/${id}/assign`, { departmentId }).then(load);

  if (error) return <main className="mx-auto max-w-3xl p-8"><div className="card p-8 text-rose-600">{error}</div></main>;
  if (!c) return <main className="p-8 text-center text-slate-500">Loading…</main>;

  const canAct = user.role === 'admin' || (user.role === 'department' && c.departmentId === user.departmentId);
  const nearbyFacilities = Array.isArray(c.nearbyFacilities) ? c.nearbyFacilities : [];

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
      <section className="space-y-5 lg:col-span-2">
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Complaint #{c.id}</p>
              <h1 className="font-display text-2xl font-bold">{c.title}</h1>
            </div>
            <div className="flex items-center gap-2"><PriorityBadge priority={c.priority} /><StatusBadge status={c.status} /></div>
          </div>
          {c.location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><FiMapPin /> {c.location}</p>}
          {c.latitude != null && c.longitude != null && (
            <div className="mt-2 text-sm text-slate-500">
              <p>Captured coordinates: {Number(c.latitude).toFixed(6)}, {Number(c.longitude).toFixed(6)}</p>
              <a
                href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-civic underline"
              >
                Open in Google Maps
              </a>
            </div>
          )}
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{c.description}</p>

          {c.attachments.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="label"><FiPaperclip className="mb-0.5 mr-1 inline" />Attachments</p>
              <div className="flex flex-wrap gap-3">
                {c.attachments.map((a) =>
                  a.mimetype.startsWith('image/') ? (
                    <a key={a.id} href={fileUrl(a.path)} target="_blank" rel="noreferrer">
                      <img src={fileUrl(a.path)} alt={a.filename} className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200" />
                    </a>
                  ) : (
                    <a key={a.id} href={fileUrl(a.path)} target="_blank" rel="noreferrer" className="btn-ghost text-xs">{a.filename}</a>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI triage card */}
        <div className="card border-l-4 border-l-civic p-6">
          <p className="mb-3 flex items-center gap-2 font-display font-bold"><FiCpu className="text-civic" /> AI triage</p>
          {c.status === 'AI Processing' ? (
            <p className="animate-pulse text-sm text-slate-500">Analysing your complaint — categorising, prioritising and checking for duplicates…</p>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-400">Category</dt><dd className="font-medium">{c.category || '—'}</dd></div>
              <div><dt className="text-slate-400">Assigned department</dt><dd className="font-medium">{c.department?.departmentName || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-400">Summary for administrators</dt><dd className="font-medium">{c.summary || '—'}</dd></div>
            </dl>
          )}
          {c.duplicateOf && (
            <p className="mt-3 rounded-lg bg-civic-tint p-3 text-sm">
              Merged with <Link className="font-semibold text-civic-dark underline" to={`/complaints/${c.duplicateOf.id}`}>#{c.duplicateOf.id} — {c.duplicateOf.title}</Link>. Its progress updates this complaint automatically.
            </p>
          )}
          {c.duplicates?.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              {c.duplicates.length} duplicate report{c.duplicates.length > 1 ? 's' : ''} merged into this complaint:
              {c.duplicates.map((d) => <Link key={d.id} to={`/complaints/${d.id}`} className="ml-1 text-civic underline">#{d.id}</Link>)}
            </p>
          )}
        </div>

        <div className="card p-6">
          <p className="mb-3 font-display font-bold">Nearby help facilities</p>
          {nearbyFacilities.length > 0 ? (
            <div className="space-y-3 text-sm">
              {nearbyFacilities.map((facility, index) => (
                <div key={`${facility.name}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="font-semibold text-ink">{facility.name}</p>
                  <p className="text-slate-500">{facility.type}</p>
                  <p className="text-xs text-slate-400">About {facility.distanceMeters} m away</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No nearby facilities were captured for this complaint, or location data was not available.
            </p>
          )}
        </div>

        {canAct && (
          <div className="card p-6">
            <p className="mb-3 font-display font-bold">Update status</p>
            <input className="input mb-3" placeholder="Add a note for the citizen (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatus('Accepted')} className="btn-ghost">Accept</button>
              <button onClick={() => setStatus('In Progress')} className="btn-ink">Start work</button>
              <button onClick={() => setStatus('Resolved')} className="btn-civic">Mark resolved</button>
              <button onClick={() => setStatus('Rejected')} className="btn-ghost text-rose-600">Reject</button>
              {user.role === 'admin' && <button onClick={() => setStatus('Closed')} className="btn-ghost">Close</button>}
            </div>
            {user.role === 'admin' && departments.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="label">Re-route to another department</label>
                <select className="input" value={c.departmentId || ''} onChange={(e) => reassign(e.target.value)}>
                  <option value="" disabled>Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <div className="card p-6">
          <p className="mb-4 font-display font-bold">Progress</p>
          <StatusTimeline history={c.statusHistory} />
        </div>
        {user.role !== 'citizen' && (
          <div className="card p-6 text-sm">
            <p className="mb-2 font-display font-bold">Filed by</p>
            <p className="font-medium">{c.user.name}</p>
            <p className="text-slate-500">{c.user.email}</p>
            <p className="mt-2 text-slate-400">{new Date(c.createdAt).toLocaleString()}</p>
          </div>
        )}
      </aside>
    </main>
  );
}
