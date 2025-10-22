import { useState, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function Login() {
  const { login } = useContext(AuthContext);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      login(response.data.token, response.data.user);
      toast.success('Erfolgreich angemeldet!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      <Card className="w-full max-w-md shadow-2xl border-0" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl sm:text-4xl font-bold" style={{ color: '#d63031' }}>
            Fahrschule <span style={{ textTransform: 'lowercase' }}>saferide</span>
          </CardTitle>
          <CardDescription className="text-base">by Nadine Stäubli</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Benutzername</Label>
              <Input
                id="login-username"
                data-testid="login-username-input"
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Passwort</Label>
              <Input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="login-submit-btn"
              style={{ background: '#d63031', color: 'white' }}
            >
              {loading ? 'Anmeldung...' : 'Anmelden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;