import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, User } from 'lucide-react';
import { formatDate, getCurrentDateISO } from '../utils/dateUtils';

function CustomerManagement() {
  const { token } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '', active: true });
  const [remarkText, setRemarkText] = useState('');
  const [remarkFile, setRemarkFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try { const response = await axios.get(`${API}/customers`, { headers: { Authorization: token } }); setCustomers(response.data); response.data.forEach(c => fetchRemarks(c.id)); } catch (error) { toast.error('Fehler'); }
  };

  const fetchRemarks = async (customerId) => {
    try { const response = await axios.get(`${API}/customers/${customerId}/remarks`, { headers: { Authorization: token } }); setRemarks(prev => ({ ...prev, [customerId]: response.data })); } catch (error) { console.error(error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingCustomer) { await axios.put(`${API}/customers/${editingCustomer.id}`, customerForm, { headers: { Authorization: token } }); toast.success('Aktualisiert'); } else { await axios.post(`${API}/customers`, customerForm, { headers: { Authorization: token } }); toast.success('Hinzugefuegt'); }
      setShowDialog(false); setEditingCustomer(null); setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '', active: true }); fetchCustomers();
    } catch (error) { toast.error('Fehler'); } finally { setLoading(false); }
  };

  const handleAddRemark = async (customerId) => {
    if (!remarkText.trim()) { toast.error('Bitte Bemerkung eingeben'); return; }
    try {
      const res = await axios.post(`${API}/customer-remarks`, { customer_id: customerId, date: getCurrentDateISO(), remarks: remarkText }, { headers: { Authorization: token } });
      if (remarkFile) { const fd = new FormData(); fd.append('file', remarkFile); await axios.post(`${API}/customer-remarks/${res.data.id}/upload`, fd, { headers: { Authorization: token } }); }
      toast.success('Hinzugefuegt'); setRemarkText(''); setRemarkFile(null); setSelectedCustomer(null); fetchRemarks(customerId);
    } catch (error) { toast.error('Fehler'); }
  };

  const handleToggleActive = async (customerId, currentActive) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      await axios.put(`${API}/customers/${customerId}`, { ...customer, active: !currentActive }, { headers: { Authorization: token } });
      toast.success(currentActive ? 'Als inaktiv markiert' : 'Als aktiv markiert');
      fetchCustomers();
    } catch (error) { toast.error('Fehler'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await axios.delete(`${API}/customers/${deleteConfirm}`, { headers: { Authorization: token } }); toast.success('Geloescht'); fetchCustomers(); } catch (error) { toast.error('Fehler'); } finally { setDeleteConfirm(null); }
  };

  const activeCustomers = customers.filter(c => c.active !== false);
  const inactiveCustomers = customers.filter(c => c.active === false);

  const CustomerList = ({ customerList }) => (
    <Accordion type="single" collapsible className="w-full">
      {customerList.map(c => (
        <AccordionItem key={c.id} value={c.id}>
          <AccordionTrigger className="px-6 hover:bg-gray-50">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#ffe8e8' }}>
                <User className="h-5 w-5" style={{ color: '#d63031' }} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">{c.vorname} {c.name}</p>
                <p className="text-sm text-gray-600">{c.telefon} | {c.email}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-sm text-gray-600">Adresse</p><p className="font-medium">{c.strasse}</p><p className="font-medium">{c.plz} {c.ort}</p></div>
                <div><p className="text-sm text-gray-600">Kontakt</p><p className="font-medium">Tel: {c.telefon}</p><p className="font-medium">Email: {c.email}</p></div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <Switch checked={c.active !== false} onCheckedChange={() => handleToggleActive(c.id, c.active !== false)} />
                <span className="text-sm font-medium">{c.active !== false ? 'Aktiver Schueler' : 'Inaktiver Schueler'}</span>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingCustomer(c); setCustomerForm(c); setShowDialog(true); }}><Edit2 className="mr-2 h-4 w-4" />Bearbeiten</Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(c.id)} style={{ color: '#d63031' }}><Trash2 className="mr-2 h-4 w-4" />Loeschen</Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Bemerkungen</h4>
                <div className="space-y-3 mb-4">
                  <Textarea placeholder="Neue Bemerkung..." value={selectedCustomer === c.id ? remarkText : ''} onChange={(e) => { setSelectedCustomer(c.id); setRemarkText(e.target.value); }} rows={2} />
                  <div className="flex gap-2">
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { setSelectedCustomer(c.id); setRemarkFile(e.target.files[0]); }} className="flex-1" />
                    <Button onClick={() => handleAddRemark(c.id)} disabled={!remarkText.trim() || selectedCustomer !== c.id} style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Speichern</Button>
                  </div>
                </div>
                {remarks[c.id] && remarks[c.id].length > 0 ? (<div className="space-y-2">{remarks[c.id].map(r => (<div key={r.id} className="p-3 border rounded bg-gray-50"><p className="text-xs text-gray-500">{formatDate(r.date)}</p><p className="mt-1">{r.remarks}</p>{r.file_url && <a href={`${API.replace('/api', '')}${r.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Foto ansehen</a>}</div>))}</div>) : (<p className="text-gray-500 text-sm">Noch keine Bemerkungen</p>)}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
      {customerList.length === 0 && <div className="p-12 text-center text-gray-500">Keine Kunden in dieser Kategorie</div>}
    </Accordion>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Kunde loeschen?</AlertDialogTitle><AlertDialogDescription>Moechten Sie diesen Kunden wirklich loeschen?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleDelete} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Kundenverwaltung</h1>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingCustomer(null); setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '', active: true }); } }}>
          <DialogTrigger asChild><Button style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Kunde</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Neuer Kunde</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Name</Label><Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required /></div>
              <div><Label>Vorname</Label><Input value={customerForm.vorname} onChange={(e) => setCustomerForm({ ...customerForm, vorname: e.target.value })} required /></div>
              <div><Label>Strasse</Label><Input value={customerForm.strasse} onChange={(e) => setCustomerForm({ ...customerForm, strasse: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4"><div><Label>PLZ</Label><Input value={customerForm.plz} onChange={(e) => setCustomerForm({ ...customerForm, plz: e.target.value })} required /></div><div><Label>Ort</Label><Input value={customerForm.ort} onChange={(e) => setCustomerForm({ ...customerForm, ort: e.target.value })} required /></div></div>
              <div><Label>Telefon</Label><Input value={customerForm.telefon} onChange={(e) => setCustomerForm({ ...customerForm, telefon: e.target.value })} required /></div>
              <div><Label>E-Mail</Label><Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} required /></div>
              <div className="flex items-center gap-2">
                <Switch checked={customerForm.active} onCheckedChange={(checked) => setCustomerForm({ ...customerForm, active: checked })} />
                <Label>Aktiver Schueler</Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Speichern...' : 'Hinzufuegen'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">Aktive Schueler ({activeCustomers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inaktive Schueler ({inactiveCustomers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="border-0 shadow-lg"><CardContent className="p-0"><CustomerList customerList={activeCustomers} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card className="border-0 shadow-lg"><CardContent className="p-0"><CustomerList customerList={inactiveCustomers} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default CustomerManagement;