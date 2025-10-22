import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { Navigation } from '../components/Navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { formatDate, getCurrentDateISO } from '../utils/dateUtils';

function CustomerManagement() {
  const { token } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    vorname: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: ''
  });
  const [remarkText, setRemarkText] = useState('');
  const [remarkFile, setRemarkFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, {
        headers: { Authorization: token }
      });
      setCustomers(response.data);
      
      response.data.forEach(customer => {
        fetchRemarks(customer.id);
      });
    } catch (error) {
      toast.error('Fehler beim Laden der Kunden');
    }
  };

  const fetchRemarks = async (customerId) => {
    try {
      const response = await axios.get(`${API}/customers/${customerId}/remarks`, {
        headers: { Authorization: token }
      });
      setRemarks(prev => ({ ...prev, [customerId]: response.data }));
    } catch (error) {
      console.error('Fehler beim Laden der Bemerkungen:', error);
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, customerForm, {
          headers: { Authorization: token }
        });
        toast.success('Kunde aktualisiert');
      } else {
        await axios.post(`${API}/customers`, customerForm, {
          headers: { Authorization: token }
        });
        toast.success('Kunde hinzugefuegt');
      }
      
      setShowCustomerDialog(false);
      setEditingCustomer(null);
      setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '' });
      fetchCustomers();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRemark = async (customerId) => {
    if (!remarkText.trim()) {
      toast.error('Bitte Bemerkung eingeben');
      return;
    }

    try {
      const response = await axios.post(`${API}/customer-remarks`, {
        customer_id: customerId,
        date: getCurrentDateISO(),
        remarks: remarkText
      }, {
        headers: { Authorization: token }
      });

      if (remarkFile) {
        const formData = new FormData();
        formData.append('file', remarkFile);
        await axios.post(`${API}/customer-remarks/${response.data.id}/upload`, formData, {
          headers: { Authorization: token }
        });
      }
      
      toast.success('Bemerkung hinzugefuegt');
      setRemarkText('');
      setRemarkFile(null);
      setSelectedCustomer(null);
      fetchRemarks(customerId);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirm) return;

    try {
      await axios.delete(`${API}/customers/${deleteConfirm}`, {
        headers: { Authorization: token }
      });
      toast.success('Kunde geloescht');
      fetchCustomers();
    } catch (error) {
      toast.error('Fehler beim Loeschen');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      <Navigation />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Moechten Sie diesen Kunden wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} style={{ background: '#d63031', color: 'white' }}>
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Kundenverwaltung</h2>
          <Dialog open={showCustomerDialog} onOpenChange={(open) => {
            setShowCustomerDialog(open);
            if (!open) {
              setEditingCustomer(null);
              setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button style={{ background: '#d63031', color: 'white' }}>
                <Plus className="mr-2 h-4 w-4" />
                Kunde
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Vorname</Label>
                  <Input value={customerForm.vorname} onChange={(e) => setCustomerForm({ ...customerForm, vorname: e.target.value })} required />
                </div>
                <div>
                  <Label>Strasse</Label>
                  <Input value={customerForm.strasse} onChange={(e) => setCustomerForm({ ...customerForm, strasse: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PLZ</Label>
                    <Input value={customerForm.plz} onChange={(e) => setCustomerForm({ ...customerForm, plz: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Ort</Label>
                    <Input value={customerForm.ort} onChange={(e) => setCustomerForm({ ...customerForm, ort: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={customerForm.telefon} onChange={(e) => setCustomerForm({ ...customerForm, telefon: e.target.value })} required />
                </div>
                <div>
                  <Label>E-Mail</Label>
                  <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Speichern...' : (editingCustomer ? 'Aktualisieren' : 'Hinzufuegen')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">{customer.vorname} {customer.name}</CardTitle>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p>{customer.strasse}</p>
                      <p>{customer.plz} {customer.ort}</p>
                      <p>Tel: {customer.telefon}</p>
                      <p>Email: {customer.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingCustomer(customer);
                      setCustomerForm(customer);
                      setShowCustomerDialog(true);
                    }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(customer.id)}>
                      <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="font-semibold mb-3">Bemerkungen</h3>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Neue Bemerkung..."
                      value={selectedCustomer === customer.id ? remarkText : ''}
                      onChange={(e) => {
                        setSelectedCustomer(customer.id);
                        setRemarkText(e.target.value);
                      }}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          setSelectedCustomer(customer.id);
                          setRemarkFile(e.target.files[0]);
                        }}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => handleAddRemark(customer.id)} 
                        disabled={!remarkText.trim() || selectedCustomer !== customer.id}
                        style={{ background: '#d63031', color: 'white' }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Speichern
                      </Button>
                    </div>
                  </div>
                </div>

                {remarks[customer.id] && remarks[customer.id].length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {remarks[customer.id].map((remark) => (
                      <div key={remark.id} className="p-3 border rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-500">{formatDate(remark.date)}</p>
                        <p className="mt-1">{remark.remarks}</p>
                        {remark.file_url && (
                          <a href={`${API.replace('/api', '')}${remark.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                            Foto ansehen
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-4">Noch keine Bemerkungen</p>
                )}
              </CardContent>
            </Card>
          ))}

          {customers.length === 0 && (
            <Card className="border-0 shadow-lg col-span-2">
              <CardContent className="py-12 text-center text-gray-500">
                Keine Kunden vorhanden
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomerManagement;