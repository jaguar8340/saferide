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
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, User, Eye } from 'lucide-react';
import { formatDate, getCurrentDateISO } from '../utils/dateUtils';

function CustomerManagement() {
  const { token } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteRemarkConfirm, setDeleteRemarkConfirm] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '', active: true });
  const [remarkText, setRemarkText] = useState('');
  const [remarkFile, setRemarkFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, { headers: { Authorization: token } });
      setCustomers(response.data);
      response.data.forEach(c => fetchRemarks(c.id));
    } catch (error) {
      toast.error('Fehler beim Laden');
    }
  };

  const fetchRemarks = async (customerId) => {
    try {
      const response = await axios.get(`${API}/customers/${customerId}/remarks`, { headers: { Authorization: token } });
      setRemarks(prev => ({ ...prev, [customerId]: response.data }));
    } catch (error) {
      console.error('Fehler:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, customerForm, { headers: { Authorization: token } });
        toast.success('Kunde aktualisiert');
      } else {
        await axios.post(`${API}/customers`, customerForm, { headers: { Authorization: token } });
        toast.success('Kunde hinzugefuegt');
      }
      setShowDialog(false);
      setEditingCustomer(null);
      setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '', active: true });
      fetchCustomers();
    } catch (error) {
      toast.error('Fehler');
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
      const res = await axios.post(`${API}/customer-remarks`, { customer_id: customerId, date: getCurrentDateISO(), remarks: remarkText }, { headers: { Authorization: token } });
      if (remarkFile) {
        const fd = new FormData();
        fd.append('file', remarkFile);
        await axios.post(`${API}/customer-remarks/${res.data.id}/upload`, fd, { headers: { Authorization: token } });
      }
      toast.success('Bemerkung hinzugefuegt');
      setRemarkText('');
      setRemarkFile(null);
      fetchRemarks(customerId);
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const handleToggleActive = async (customerId, currentActive) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      await axios.put(`${API}/customers/${customerId}`, { ...customer, active: !currentActive }, { headers: { Authorization: token } });
      toast.success(currentActive ? 'Als inaktiv markiert' : 'Als aktiv markiert');
      fetchCustomers();
      if (selectedCustomerDetails && selectedCustomerDetails.id === customerId) {
        setSelectedCustomerDetails({ ...selectedCustomerDetails, active: !currentActive });
      }
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`${API}/customers/${deleteConfirm}`, { headers: { Authorization: token } });
      toast.success('Kunde geloescht');
      if (selectedCustomerDetails && selectedCustomerDetails.id === deleteConfirm) {
        setShowDetailsDialog(false);
        setSelectedCustomerDetails(null);
      }
      fetchCustomers();
    } catch (error) {
      toast.error('Fehler');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteRemark = async () => {
    if (!deleteRemarkConfirm) return;
    try {
      await axios.delete(`${API}/customer-remarks/${deleteRemarkConfirm}`, { headers: { Authorization: token } });
      toast.success('Bemerkung geloescht');
      if (selectedCustomerDetails) {
        fetchRemarks(selectedCustomerDetails.id);
      }
    } catch (error) {
      toast.error('Fehler');
    } finally {
      setDeleteRemarkConfirm(null);
    }
  };

  const activeCustomers = customers.filter(c => c.active !== false);
  const inactiveCustomers = customers.filter(c => c.active === false);

  const CustomerList = ({ customerList }) => (
    <div className="space-y-2">
      {customerList.map(c => (
        <Card key={c.id} className="border shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#ffe8e8' }}>
                <User className="h-5 w-5" style={{ color: '#d63031' }} />
              </div>
              <div>
                <p className="font-semibold text-lg">{c.vorname} {c.name}</p>
                <p className="text-sm text-gray-600">{c.telefon} | {c.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSelectedCustomerDetails(c); setShowDetailsDialog(true); }}>
              <Eye className="mr-2 h-4 w-4" />Details
            </Button>
          </div>
        </Card>
      ))}
      {customerList.length === 0 && <div className="p-12 text-center text-gray-500">Keine Kunden in dieser Kategorie</div>}
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde loeschen?</AlertDialogTitle>
            <AlertDialogDescription>Moechten Sie diesen Kunden wirklich loeschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRemarkConfirm} onOpenChange={() => setDeleteRemarkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bemerkung loeschen?</AlertDialogTitle>
            <AlertDialogDescription>Moechten Sie diese Bemerkung wirklich loeschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRemark} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Kundenverwaltung</h1>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingCustomer(null);
            setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '', active: true });
          }
        }}>
          <DialogTrigger asChild>
            <Button style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Kunde</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Name</Label><Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required /></div>
              <div><Label>Vorname</Label><Input value={customerForm.vorname} onChange={(e) => setCustomerForm({ ...customerForm, vorname: e.target.value })} required /></div>
              <div><Label>Strasse</Label><Input value={customerForm.strasse} onChange={(e) => setCustomerForm({ ...customerForm, strasse: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>PLZ</Label><Input value={customerForm.plz} onChange={(e) => setCustomerForm({ ...customerForm, plz: e.target.value })} required /></div>
                <div><Label>Ort</Label><Input value={customerForm.ort} onChange={(e) => setCustomerForm({ ...customerForm, ort: e.target.value })} required /></div>
              </div>
              <div><Label>Telefon</Label><Input value={customerForm.telefon} onChange={(e) => setCustomerForm({ ...customerForm, telefon: e.target.value })} required /></div>
              <div><Label>E-Mail</Label><Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} required /></div>
              <div className="flex items-center gap-2">
                <Switch checked={customerForm.active} onCheckedChange={(checked) => setCustomerForm({ ...customerForm, active: checked })} />
                <Label>Aktiver Kunde</Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Speichern...' : (editingCustomer ? 'Aktualisieren' : 'Hinzufuegen')}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">Aktive Kunden ({activeCustomers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inaktive Kunden ({inactiveCustomers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <CustomerList customerList={activeCustomers} />
        </TabsContent>
        <TabsContent value="inactive">
          <CustomerList customerList={inactiveCustomers} />
        </TabsContent>
      </Tabs>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={(open) => {
        setShowDetailsDialog(open);
        if (!open) {
          setSelectedCustomerDetails(null);
          setRemarkText('');
          setRemarkFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCustomerDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedCustomerDetails.vorname} {selectedCustomerDetails.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Adresse</p>
                    <p className="font-medium">{selectedCustomerDetails.strasse}</p>
                    <p className="font-medium">{selectedCustomerDetails.plz} {selectedCustomerDetails.ort}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Kontakt</p>
                    <p className="font-medium">Tel: {selectedCustomerDetails.telefon}</p>
                    <p className="font-medium">Email: {selectedCustomerDetails.email}</p>
                  </div>
                </div>

                {/* Active/Inactive Switch */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <Switch 
                    checked={selectedCustomerDetails.active !== false} 
                    onCheckedChange={() => handleToggleActive(selectedCustomerDetails.id, selectedCustomerDetails.active !== false)} 
                  />
                  <span className="text-sm font-medium">{selectedCustomerDetails.active !== false ? 'Aktiver Kunde' : 'Inaktiver Kunde'}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingCustomer(selectedCustomerDetails);
                    setCustomerForm(selectedCustomerDetails);
                    setShowDialog(true);
                  }}>
                    <Edit2 className="mr-2 h-4 w-4" />Bearbeiten
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(selectedCustomerDetails.id)} style={{ color: '#d63031' }}>
                    <Trash2 className="mr-2 h-4 w-4" />Kunde loeschen
                  </Button>
                </div>

                {/* Remarks Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 text-lg">Bemerkungen</h4>
                  
                  {/* Add Remark Form */}
                  <div className="space-y-3 mb-4">
                    <Textarea
                      placeholder="Neue Bemerkung eingeben..."
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors" style={{ borderColor: '#e67e22' }}>
                          <Upload className="h-6 w-6 mx-auto mb-1" style={{ color: '#e67e22' }} />
                          <p className="text-sm font-medium" style={{ color: '#e67e22' }}>
                            Foto hochladen (optional)
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG</p>
                          {remarkFile && (
                            <p className="text-sm font-semibold mt-2 text-green-600">{remarkFile.name}</p>
                          )}
                        </div>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setRemarkFile(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      <Button
                        onClick={() => handleAddRemark(selectedCustomerDetails.id)}
                        disabled={!remarkText.trim()}
                        size="lg"
                        style={{ background: '#d63031', color: 'white', minWidth: '130px' }}
                      >
                        <Plus className="mr-2 h-5 w-5" />Speichern
                      </Button>
                    </div>
                  </div>

                  {/* Remarks List */}
                  {remarks[selectedCustomerDetails.id] && remarks[selectedCustomerDetails.id].length > 0 ? (
                    <div className="space-y-2">
                      {remarks[selectedCustomerDetails.id].map(r => (
                        <div key={r.id} className="flex justify-between items-start p-3 border rounded bg-white">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-semibold">{formatDate(r.date)}</p>
                            <p className="mt-1">{r.remarks}</p>
                            {r.file_url && (
                              <a href={`${API.replace('/api', '')}${r.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                                Foto ansehen
                              </a>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteRemarkConfirm(r.id)}>
                            <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Noch keine Bemerkungen</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default CustomerManagement;
