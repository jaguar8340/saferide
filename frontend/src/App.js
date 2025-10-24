import React, { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import YearlyView from './pages/YearlyView';
import Statistics from './pages/Statistics';
import VehicleManagement from './pages/VehicleManagement';
import CustomerManagement from './pages/CustomerManagement';
import FilesOverview from './pages/FilesOverview';
import AccountManagement from './pages/AccountManagement';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import { Toaster } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);
    }
  }, [token]);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <BrowserRouter>
        {token ? (
          <Sidebar>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/yearly" element={<YearlyView />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/vehicles" element={<VehicleManagement />} />
              <Route path="/customers" element={<CustomerManagement />} />
              <Route path="/files" element={<FilesOverview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/accounts" element={user?.role === 'admin' ? <AccountManagement /> : <Navigate to="/" />} />
              <Route path="/users" element={user?.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Sidebar>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;