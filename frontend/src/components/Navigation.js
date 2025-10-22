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
    { path: '/statistics', icon: BarChart3, label: 'Statistik' },
    { path: '/vehicles', icon: Car, label: 'Fahrzeugübersicht' },
    { path: '/customers', icon: UsersIcon, label: 'Kundenverwaltung' },
    { path: '/files', icon: FolderOpen, label: 'Dateien' },
  ];

  const adminItems = [
    { path: '/accounts', icon: Settings, label: 'Konten verwalten' },
    { path: '/users', icon: UsersIcon, label: 'Benutzer verwalten' },
  ];

  return (
    <div className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Row */}
        <div className="py-3 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#d63031' }}>
                Fahrschule saferide by Nadine Stäubli
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">{user?.username} ({user?.role})</p>
            </div>
            <Button variant="ghost" onClick={logout} className="hidden sm:flex items-center gap-2" size="sm">
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Abmelden</span>
            </Button>
          </div>
        </div>

        {/* Navigation Row */}
        <div className="py-2">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 whitespace-nowrap ${
                  isActive(item.path) ? 'bg-red-50' : ''
                }`}
                style={isActive(item.path) ? { color: '#d63031', fontWeight: '600' } : {}}
                size="sm"
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
                className={`flex items-center gap-2 whitespace-nowrap ${
                  isActive(item.path) ? 'bg-red-50' : ''
                }`}
                style={isActive(item.path) ? { color: '#d63031', fontWeight: '600' } : {}}
                size="sm"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <select 
              className="w-full px-3 py-2 border rounded-md text-sm"
              onChange={(e) => {
                if (e.target.value === 'logout') {
                  logout();
                } else if (e.target.value) {
                  navigate(e.target.value);
                }
              }}
              value={location.pathname}
            >
              <option value="">Menü wählen</option>
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
