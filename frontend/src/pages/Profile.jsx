import { useAuth } from '../hooks/useAuth.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="card p-8 text-center">
        {user.picture
          ? <img src={user.picture} alt="" className="mx-auto h-24 w-24 rounded-full ring-4 ring-civic" referrerPolicy="no-referrer" />
          : <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-ink text-3xl font-bold text-white">{user.name[0]}</span>}
        <h1 className="mt-4 font-display text-2xl font-bold">{user.name}</h1>
        <p className="text-slate-500">{user.email}</p>
        <span className="mt-3 inline-block rounded-full bg-civic-tint px-3 py-1 text-sm font-semibold capitalize text-civic-dark">{user.role}</span>
        <div className="mt-8">
          <button onClick={logout} className="btn-ghost">Sign out</button>
        </div>
      </div>
    </main>
  );
}
