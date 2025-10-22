import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2 } from 'lucide-react';

function UserManagement() {
  const { token, user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'user' });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => { try { const response = await axios.get(`${API}/users`, { headers: { Authorization: token } }); setUsers(response.data); } catch (error) { toast.error('Fehler'); } };

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
      setShowPasswordDialog(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Aendern');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await axios.post(`${API}/auth/register`, formData); toast.success('Erstellt'); setShowDialog(false); setFormData({ username: '', password: '', role: 'user' }); fetchUsers(); } catch (error) { toast.error('Fehler'); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await axios.delete(`${API}/users/${deleteConfirm}`, { headers: { Authorization: token } }); toast.success('Geloescht'); fetchUsers(); } catch (error) { toast.error('Fehler'); } finally { setDeleteConfirm(null); }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Benutzer loeschen?</AlertDialogTitle><AlertDialogDescription>Moechten Sie diesen Benutzer wirklich loeschen?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleDelete} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: '#d63031' }}>Benutzer verwalten</h1>
      <Card className="border-0 shadow-lg"><CardHeader><div className="flex justify-between items-center"><CardTitle>Benutzer</CardTitle><Dialog open={showDialog} onOpenChange={setShowDialog}><DialogTrigger asChild><Button style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Benutzer</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Neuer Benutzer</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div><Label>Benutzername</Label><Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required /></div><div><Label>Passwort</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div><div><Label>Rolle</Label><Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Benutzer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div><Button type="submit" className="w-full" disabled={loading}>{loading ? 'Erstellen...' : 'Erstellen'}</Button></form></DialogContent></Dialog></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">Benutzername</th><th className="p-3 text-left">Rolle</th><th className="p-3 text-right">Aktionen</th></tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-b"><td className="p-3 font-medium">{u.username}</td><td className="p-3"><span className="px-2 py-1 rounded text-xs" style={{ background: u.role === 'admin' ? '#ffe8e8' : '#f0f0f0', color: u.role === 'admin' ? '#d63031' : '#666' }}>{u.role === 'admin' ? 'Admin' : 'Benutzer'}</span></td><td className="p-3"><div className="flex justify-end">{u.id !== currentUser.id && <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(u.id)}><Trash2 className="h-4 w-4" style={{ color: '#d63031' }} /></Button>}</div></td></tr>))}{users.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-500">Keine Benutzer</td></tr>}</tbody></table></div></CardContent></Card>
    </main>
  );
}

export default UserManagement;