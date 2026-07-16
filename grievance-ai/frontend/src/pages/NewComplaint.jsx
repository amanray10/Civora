import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPaperclip, FiSend, FiGlobe } from 'react-icons/fi';
import api from '../services/api';

export default function NewComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', location: '', latitude: '', longitude: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');

  // Translation preview state
  const [titleTranslation, setTitleTranslation] = useState(null);
  const [descTranslation, setDescTranslation] = useState(null);
  const [translatingTitle, setTranslatingTitle] = useState(false);
  const [translatingDesc, setTranslatingDesc] = useState(false);
  const titleTimerRef = useRef(null);
  const descTimerRef = useRef(null);

  // Debounced translation for title
  const debouncedTranslateTitle = useCallback((text) => {
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    if (!text || text.trim().length < 5) {
      setTitleTranslation(null);
      return;
    }
    titleTimerRef.current = setTimeout(async () => {
      setTranslatingTitle(true);
      try {
        const { data } = await api.post('/translate', { text: text.trim() });
        if (data.translation?.detected) {
          setTitleTranslation(data.translation);
        } else {
          setTitleTranslation(null);
        }
      } catch {
        setTitleTranslation(null);
      } finally {
        setTranslatingTitle(false);
      }
    }, 800);
  }, []);

  // Debounced translation for description
  const debouncedTranslateDesc = useCallback((text) => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    if (!text || text.trim().length < 5) {
      setDescTranslation(null);
      return;
    }
    descTimerRef.current = setTimeout(async () => {
      setTranslatingDesc(true);
      try {
        const { data } = await api.post('/translate', { text: text.trim() });
        if (data.translation?.detected) {
          setDescTranslation(data.translation);
        } else {
          setDescTranslation(null);
        }
      } catch {
        setDescTranslation(null);
      } finally {
        setTranslatingDesc(false);
      }
    }, 800);
  }, []);

  // Trigger translation when form fields change
  useEffect(() => {
    debouncedTranslateTitle(form.title);
    return () => { if (titleTimerRef.current) clearTimeout(titleTimerRef.current); };
  }, [form.title, debouncedTranslateTitle]);

  useEffect(() => {
    debouncedTranslateDesc(form.description);
    return () => { if (descTimerRef.current) clearTimeout(descTimerRef.current); };
  }, [form.description, debouncedTranslateDesc]);

  const captureLocation = () => {
    setError('');
    setLocationNote('');

    if (!navigator.geolocation) {
      setLocationNote('Browser geolocation is not supported here.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);

        setForm((current) => ({
          ...current,
          latitude,
          longitude,
          location: current.location.trim() || `GPS captured: ${latitude}, ${longitude}`
        }));
        setLocationNote(`Location captured from your browser at ${latitude}, ${longitude}.`);
        setLocating(false);
      },
      (geoError) => {
        setLocationNote(geoError.message || 'Unable to capture your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
          <FiGlobe className="text-[10px]" /> Hindi · Marathi · English supported
        </span>
      </p>

      <form onSubmit={submit} className="card space-y-5 p-6">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2">
            <label className="label mb-0">Title</label>
            {translatingTitle && (
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 animate-pulse">
                <FiGlobe className="text-[10px]" /> detecting language…
              </span>
            )}
            {titleTranslation?.language && !translatingTitle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 animate-fade-in">
                <FiGlobe className="text-[10px]" /> {titleTranslation.language} detected
              </span>
            )}
          </div>
          <input className="input mt-1.5" placeholder="e.g. Street lights not working on MG Road / Sadak par gaddha hai" maxLength={200}
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          {titleTranslation?.detected && (
            <TranslationPreview translation={titleTranslation} />
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center gap-2">
            <label className="label mb-0">Description</label>
            {translatingDesc && (
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 animate-pulse">
                <FiGlobe className="text-[10px]" /> detecting language…
              </span>
            )}
            {descTranslation?.language && !translatingDesc && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 animate-fade-in">
                <FiGlobe className="text-[10px]" /> {descTranslation.language} detected
              </span>
            )}
          </div>
          <textarea className="input mt-1.5 min-h-36" placeholder="What happened, since when, and how is it affecting you? You can type in Hindi or Marathi too!"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          {descTranslation?.detected && (
            <TranslationPreview translation={descTranslation} />
          )}
        </div>

        {/* Location */}
        <div>
          <label className="label">Location</label>
          <input className="input" placeholder="Street / landmark / ward — helps merge duplicate reports"
            value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost text-xs" onClick={captureLocation} disabled={locating}>
              {locating ? 'Capturing location…' : 'Use my current location'}
            </button>
            {(form.latitude || form.longitude) && (
              <span className="text-xs text-slate-500">
                GPS: {form.latitude}, {form.longitude}
              </span>
            )}
          </div>
          {locationNote && <p className="mt-1 text-xs text-slate-500">{locationNote}</p>}
        </div>

        {/* Files */}
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

/** Translation preview banner component */
function TranslationPreview({ translation }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !translation?.detected) return null;

  return (
    <div
      className="mt-2 overflow-hidden rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 shadow-sm"
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <FiGlobe className="text-xs" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-indigo-700">
            {translation.language} detected — here&apos;s what we understood:
          </p>
          <p className="mt-0.5 text-sm italic text-slate-700 leading-relaxed">
            &ldquo;{translation.english}&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );
}
