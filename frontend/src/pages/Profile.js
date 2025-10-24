import { useState, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key } from 'lucide-react';

function Profile() {
  const { token, user } = useContext(AuthContext);
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Neue Passwoerter stimmen nicht ueberein');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/users/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      }, { headers: { Authorization: token } });
      
      toast.success('Passwort erfolgreich geaendert');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Aendern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: '#d63031' }}>Mein Profil</h1>
      
      <Card className="border-0 shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#ffe8e8' }}>
              <Key className="h-5 w-5" style={{ color: '#d63031' }} />
            </div>
            Benutzerinformationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Benutzername</p>
              <p className="font-semibold text-lg">{user?.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rolle</p>
              <span className="px-3 py-1 rounded text-sm" style={{ 
                background: user?.role === 'admin' ? '#ffe8e8' : '#f0f0f0',
                color: user?.role === 'admin' ? '#d63031' : '#666'
              }}>
                {user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label>Altes Passwort</Label>
              <Input 
                type="password" 
                value={passwordData.old_password} 
                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })} 
                required 
                placeholder="Aktuelles Passwort eingeben"
              />
            </div>
            <div>
              <Label>Neues Passwort</Label>
              <Input 
                type="password" 
                value={passwordData.new_password} 
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} 
                required 
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
            <div>
              <Label>Neues Passwort bestätigen</Label>
              <Input 
                type="password" 
                value={passwordData.confirm_password} 
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} 
                required 
                placeholder="Passwort wiederholen"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              style={{ background: '#d63031', color: 'white' }}
            >
              {loading ? 'Wird geändert...' : 'Passwort ändern'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default Profile;
