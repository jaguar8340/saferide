import { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, Car, Users as UsersIcon, Settings, LogOut, FolderOpen } from 'lucide-react';

export function VerticalNavigation({ children }) {
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
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      {/* Sidebar */}
      <div className="hidden lg:block w-64 bg-white border-r shadow-lg fixed h-full overflow-y-auto">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold leading-tight" style={{ color: '#d63031' }}>
            Fahrschule saferide<br/>by Nadine Stäubli
          </h1>
          <p className="text-xs text-gray-600 mt-2">{user?.username} ({user?.role})</p>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className={`w-full justify-start ${
                isActive(item.path) ? 'bg-red-50' : ''
              }`}
              style={isActive(item.path) ? { color: '#d63031', fontWeight: '600' } : {}}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          ))}
          
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase">Admin</p>
              </div>
              {adminItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={`w-full justify-start ${
                    isActive(item.path) ? 'bg-red-50' : ''
                  }`}
                  style={isActive(item.path) ? { color: '#d63031', fontWeight: '600' } : {}}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </>
          )}

          <div className="pt-4">
            <Button variant="ghost" onClick={logout} className="w-full justify-start text-gray-600">
              <LogOut className="mr-3 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </nav>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold" style={{ color: '#d63031' }}>
              Fahrschule saferide
            </h1>
            <Button variant="ghost" onClick={logout} size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <select 
            className="w-full px-3 py-2 border rounded-md text-sm"
            onChange={(e) => {
              if (e.target.value) navigate(e.target.value);
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
          </select>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 lg:ml-64 mt-0 lg:mt-0">
        <div className="lg:hidden h-24"></div>
        {children}
      </div>
    </div>
  );
}
