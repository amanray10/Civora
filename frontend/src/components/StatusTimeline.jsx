import { FiCheckCircle } from 'react-icons/fi';

// Vertical audit trail of every status change on a complaint
export default function StatusTimeline({ history = [] }) {
  return (
    <ol className="relative ml-3 border-l-2 border-slate-200">
      {history.map((h, i) => (
        <li key={h.id} className="mb-6 ml-5 last:mb-0">
          <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full
            ${i === history.length - 1 ? 'bg-civic text-white' : 'bg-slate-200 text-slate-500'}`}>
            <FiCheckCircle size={12} />
          </span>
          <p className="text-sm font-semibold">{h.status}</p>
          {h.note && <p className="text-sm text-slate-500">{h.note}</p>}
          <p className="text-xs text-slate-400">
            {new Date(h.timestamp).toLocaleString()} {h.updatedBy ? `· by ${h.updatedBy.name}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
