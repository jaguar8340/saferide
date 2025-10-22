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
import { Plus, Trash2, Edit2 } from 'lucide-react';

function AccountManagement() {
  const { token } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'income' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => { try { const response = await axios.get(`${API}/accounts`); setAccounts(response.data); } catch (error) { toast.error('Fehler'); } };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingAccount) { await axios.put(`${API}/accounts/${editingAccount.id}`, formData, { headers: { Authorization: token } }); toast.success('Aktualisiert'); } else { await axios.post(`${API}/accounts`, formData, { headers: { Authorization: token } }); toast.success('Erstellt'); }
      setShowDialog(false); setEditingAccount(null); setFormData({ name: '', type: 'income' }); fetchAccounts();
    } catch (error) { toast.error('Fehler'); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await axios.delete(`${API}/accounts/${deleteConfirm}`, { headers: { Authorization: token } }); toast.success('Geloescht'); fetchAccounts(); } catch (error) { toast.error('Fehler'); } finally { setDeleteConfirm(null); }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Konto loeschen?</AlertDialogTitle><AlertDialogDescription>Moechten Sie dieses Konto wirklich loeschen?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleDelete} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: '#d63031' }}>Konten verwalten</h1>
      <Card className="border-0 shadow-lg"><CardHeader><div className="flex justify-between items-center"><CardTitle>Konten</CardTitle><Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingAccount(null); setFormData({ name: '', type: 'income' }); } }}><DialogTrigger asChild><Button style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Konto</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Neues Konto</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div><Label>Name</Label><Input placeholder="z.B. Einnahmen Fahrstunden" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div><div><Label>Typ</Label><Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Einnahmen</SelectItem><SelectItem value="expense">Ausgaben</SelectItem></SelectContent></Select></div><Button type="submit" className="w-full" disabled={loading}>{loading ? 'Speichern...' : 'Erstellen'}</Button></form></DialogContent></Dialog></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Typ</th><th className="p-3 text-right">Aktionen</th></tr></thead><tbody>{accounts.map(acc => (<tr key={acc.id} className="border-b"><td className="p-3 font-medium">{acc.name}</td><td className="p-3"><span className="px-2 py-1 rounded text-xs" style={{ background: acc.type === 'income' ? '#e8f8f5' : '#fef5e7', color: acc.type === 'income' ? '#27ae60' : '#e67e22' }}>{acc.type === 'income' ? 'Einnahmen' : 'Ausgaben'}</span></td><td className="p-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditingAccount(acc); setFormData({ name: acc.name, type: acc.type }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(acc.id)}><Trash2 className="h-4 w-4" style={{ color: '#d63031' }} /></Button></div></td></tr>))}{accounts.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-500">Keine Konten</td></tr>}</tbody></table></div></CardContent></Card>
    </main>
  );
}

export default AccountManagement;