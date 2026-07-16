const STYLES = {
  'Submitted':     'bg-slate-100 text-slate-700',
  'AI Processing': 'bg-violet-100 text-violet-700',
  'Assigned':      'bg-blue-100 text-blue-700',
  'Accepted':      'bg-cyan-100 text-cyan-700',
  'In Progress':   'bg-amber-100 text-amber-700',
  'Resolved':      'bg-emerald-100 text-emerald-700',
  'Rejected':      'bg-rose-100 text-rose-700',
  'Closed':        'bg-slate-200 text-slate-600'
};

const PRIORITY = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-sky-100 text-sky-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-600 text-white'
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] || STYLES.Submitted}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY[priority]}`}>
      {priority}
    </span>
  );
}
