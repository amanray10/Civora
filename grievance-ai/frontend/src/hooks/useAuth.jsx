import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const navigate = useNavigate();

  useEffect(() => { if (user) connectSocket(); }, [user]);

  const finishLogin = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    connectSocket();
    navigate(user.role === 'admin' ? '/admin' : user.role === 'department' ? '/department' : '/dashboard');
  };

  const loginWithGoogle = async (credential) =>
    finishLogin((await api.post('/auth/google', { credential })).data);

  const loginWithEmail = async (email, password) =>
    finishLogin((await api.post('/auth/login', { email, password })).data);

  const register = async (name, email, password) =>
    finishLogin((await api.post('/auth/register', { name, email, password })).data);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithEmail, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
