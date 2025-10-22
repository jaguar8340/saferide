import { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, Car, Users as UsersIcon, Settings, LogOut } from 'lucide-react';

export function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: FileText, label: 'Monatsansicht' },
    { path: '/yearly', icon: BarChart3, label: 'Jahresübersicht' },
    { path: '/accounting', icon: BarChart3, label: 'Buchhaltung/Abschluss' },
    { path: '/vehicles', icon: Car, label: 'Fahrzeugübersicht' },
    { path: '/customers', icon: UsersIcon, label: 'Kundenverwaltung' },
  ];

  const adminItems = [
    { path: '/accounts', icon: Settings, label: 'Konten verwalten' },
    { path: '/users', icon: UsersIcon, label: 'Benutzer verwalten' },
  ];

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#d63031' }}>
              <span className="hidden sm:inline">Fahrschule saferide by Nadine Stäubli</span>
              <span className="sm:hidden">Saferide</span>
            </h2>
            <p className="text-xs text-gray-600">{user?.username}</p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 ${
                  isActive(item.path) ? 'bg-red-50' : ''
                }`}
                style={isActive(item.path) ? { color: '#d63031' } : {}}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
            
            {user?.role === 'admin' && adminItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 ${
                  isActive(item.path) ? 'bg-red-50' : ''
                }`}
                style={isActive(item.path) ? { color: '#d63031' } : {}}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}

            <Button variant="ghost" onClick={logout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Abmelden</span>
            </Button>
          </div>

          {/* Mobile Navigation - Dropdown */}
          <div className="lg:hidden">
            <select 
              className="px-3 py-2 border rounded-md text-sm"
              onChange={(e) => {
                if (e.target.value === 'logout') {
                  logout();
                } else if (e.target.value) {
                  navigate(e.target.value);
                }
              }}
              value={location.pathname}
            >
              <option value="">Menü</option>
              {navItems.map((item) => (
                <option key={item.path} value={item.path}>{item.label}</option>
              ))}
              {user?.role === 'admin' && adminItems.map((item) => (
                <option key={item.path} value={item.path}>{item.label}</option>
              ))}
              <option value="logout">Abmelden</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
