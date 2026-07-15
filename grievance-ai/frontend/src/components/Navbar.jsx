import { Link, NavLink } from 'react-router-dom';
import { FiLogOut, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth.jsx';

const linkCls = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-ink shadow">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link to="/dashboard" className="mr-4 font-display text-lg font-bold text-white">
          Civ<span className="text-civic">ora</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {user.role === 'citizen' && (
            <>
              <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
              <NavLink to="/complaints/new" className={linkCls}>New Complaint</NavLink>
              <NavLink to="/complaints" className={linkCls}>My Complaints</NavLink>
            </>
          )}
          {user.role === 'department' && <NavLink to="/department" className={linkCls}>Department Queue</NavLink>}
          {user.role === 'admin' && (
            <>
              <NavLink to="/admin" className={linkCls}>Admin</NavLink>
              <NavLink to="/complaints" className={linkCls}>All Complaints</NavLink>
            </>
          )}
          <NavLink to="/chatbot" className={linkCls}><FiMessageSquare className="mb-0.5 mr-1 inline" />Assistant</NavLink>
        </nav>

        <NavLink to="/profile" className="flex items-center gap-2">
          {user.picture
            ? <img src={user.picture} alt="" className="h-8 w-8 rounded-full ring-2 ring-civic" referrerPolicy="no-referrer" />
            : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-civic text-sm font-bold text-white">{user.name[0]}</span>}
        </NavLink>
        <button onClick={logout} title="Sign out" className="ml-1 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white">
          <FiLogOut />
        </button>
      </div>
    </header>
  );
}
