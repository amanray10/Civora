import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPaperclip, FiSend } from 'react-icons/fi';
import api from '../services/api';

export default function NewComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', location: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('files', f));
      const { data } = await api.post('/complaints', fd);
      navigate(`/complaints/${data.complaint.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit the complaint.');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Report a civic issue</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Describe the problem in your own words — AI will categorise it, set its priority and route it to the right department.
      </p>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <div>
          <label className="label">Title</label>
          <input className="input" placeholder="e.g. Street lights not working on MG Road" maxLength={200}
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-36" placeholder="What happened, since when, and how is it affecting you?"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" placeholder="Street / landmark / ward — helps merge duplicate reports"
            value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <label className="label"><FiPaperclip className="mb-0.5 mr-1 inline" />Photos or documents (optional, max 4 × 5 MB)</label>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFiles([...e.target.files].slice(0, 4))}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-soft" />
          {files.length > 0 && <p className="mt-1 text-xs text-slate-500">{files.map((f) => f.name).join(', ')}</p>}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="btn-civic w-full justify-center" disabled={busy}>
          <FiSend /> {busy ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>
    </main>
  );
}
