import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

// Guards a route; optionally restrict by role: <Protected roles={['admin']}>
export default function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
