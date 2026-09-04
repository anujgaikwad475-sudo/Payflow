import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('payflow_token');
      const savedUser = localStorage.getItem('payflow_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('payflow_token');
          localStorage.removeItem('payflow_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('payflow_token', token);
    localStorage.setItem('payflow_user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const signup = async (formData) => {
    const res = await API.post('/auth/signup', formData);
    const { token, user: userData } = res.data;
    localStorage.setItem('payflow_token', token);
    localStorage.setItem('payflow_user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('payflow_token');
    localStorage.removeItem('payflow_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {loading ? (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm tracking-wide">Starting PayFlow...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);