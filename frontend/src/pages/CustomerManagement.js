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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Edit2, Upload } from 'lucide-react';
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
        toast.success('Kunde hinzugef\u00fcgt');
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
      
      toast.success('Bemerkung hinzugef\u00fcgt');
      setRemarkText('');
      setRemarkFile(null);
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
      toast.success('Kunde gel\u00f6scht');
      fetchCustomers();
    } catch (error) {
      toast.error('Fehler beim L\u00f6schen');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className=\"min-h-screen\" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>\n      <Navigation />\n\n      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>\n        <AlertDialogContent>\n          <AlertDialogHeader>\n            <AlertDialogTitle>Kunde l\u00f6schen?</AlertDialogTitle>\n            <AlertDialogDescription>\n              M\u00f6chten Sie diesen Kunden wirklich l\u00f6schen? Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.\n            </AlertDialogDescription>\n          </AlertDialogHeader>\n          <AlertDialogFooter>\n            <AlertDialogCancel>Abbrechen</AlertDialogCancel>\n            <AlertDialogAction onClick={handleDeleteCustomer} style={{ background: '#d63031', color: 'white' }}>\n              L\u00f6schen\n            </AlertDialogAction>\n          </AlertDialogFooter>\n        </AlertDialogContent>\n      </AlertDialog>\n\n      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8\">\n        <div className=\"flex justify-between items-center mb-6\">\n          <h1 className=\"text-2xl sm:text-3xl font-bold\" style={{ color: '#d63031' }}>Kundenverwaltung</h1>\n          <Dialog open={showCustomerDialog} onOpenChange={(open) => {\n            setShowCustomerDialog(open);\n            if (!open) {\n              setEditingCustomer(null);\n              setCustomerForm({ name: '', vorname: '', strasse: '', plz: '', ort: '', telefon: '', email: '' });\n            }\n          }}>\n            <DialogTrigger asChild>\n              <Button style={{ background: '#d63031', color: 'white' }}>\n                <Plus className=\"mr-2 h-4 w-4\" />\n                Kunde\n              </Button>\n            </DialogTrigger>\n            <DialogContent className=\"max-w-md max-h-[90vh] overflow-y-auto\">\n              <DialogHeader>\n                <DialogTitle>{editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}</DialogTitle>\n              </DialogHeader>\n              <form onSubmit={handleCustomerSubmit} className=\"space-y-4\">\n                <div>\n                  <Label>Name</Label>\n                  <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />\n                </div>\n                <div>\n                  <Label>Vorname</Label>\n                  <Input value={customerForm.vorname} onChange={(e) => setCustomerForm({ ...customerForm, vorname: e.target.value })} required />\n                </div>\n                <div>\n                  <Label>Strasse</Label>\n                  <Input value={customerForm.strasse} onChange={(e) => setCustomerForm({ ...customerForm, strasse: e.target.value })} required />\n                </div>\n                <div className=\"grid grid-cols-2 gap-4\">\n                  <div>\n                    <Label>PLZ</Label>\n                    <Input value={customerForm.plz} onChange={(e) => setCustomerForm({ ...customerForm, plz: e.target.value })} required />\n                  </div>\n                  <div>\n                    <Label>Ort</Label>\n                    <Input value={customerForm.ort} onChange={(e) => setCustomerForm({ ...customerForm, ort: e.target.value })} required />\n                  </div>\n                </div>\n                <div>\n                  <Label>Telefon</Label>\n                  <Input value={customerForm.telefon} onChange={(e) => setCustomerForm({ ...customerForm, telefon: e.target.value })} required />\n                </div>\n                <div>\n                  <Label>E-Mail</Label>\n                  <Input type=\"email\" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} required />\n                </div>\n                <Button type=\"submit\" className=\"w-full\" disabled={loading}>\n                  {loading ? 'Speichern...' : (editingCustomer ? 'Aktualisieren' : 'Hinzuf\u00fcgen')}\n                </Button>\n              </form>\n            </DialogContent>\n          </Dialog>\n        </div>\n\n        <div className=\"space-y-4\">\n          {customers.map((customer) => (\n            <Card key={customer.id} className=\"border-0 shadow-lg\">\n              <CardHeader>\n                <div className=\"flex justify-between items-start\">\n                  <div>\n                    <CardTitle className=\"text-lg sm:text-xl\">{customer.vorname} {customer.name}</CardTitle>\n                    <div className=\"text-sm text-gray-600 mt-2 space-y-1\">\n                      <p>{customer.strasse}</p>\n                      <p>{customer.plz} {customer.ort}</p>\n                      <p>Tel: {customer.telefon}</p>\n                      <p>Email: {customer.email}</p>\n                    </div>\n                  </div>\n                  <div className=\"flex gap-1\">\n                    <Button variant=\"ghost\" size=\"sm\" onClick={() => {\n                      setEditingCustomer(customer);\n                      setCustomerForm(customer);\n                      setShowCustomerDialog(true);\n                    }}>\n                      <Edit2 className=\"h-4 w-4\" />\n                    </Button>\n                    <Button variant=\"ghost\" size=\"sm\" onClick={() => setDeleteConfirm(customer.id)}>\n                      <Trash2 className=\"h-4 w-4\" style={{ color: '#d63031' }} />\n                    </Button>\n                  </div>\n                </div>\n              </CardHeader>\n              <CardContent>\n                <div className=\"mb-4\">\n                  <h3 className=\"font-semibold mb-3\">Bemerkungen</h3>\n                  <div className=\"space-y-3\">\n                    <div className=\"flex gap-2\">\n                      <Textarea\n                        placeholder=\"Neue Bemerkung...\"\n                        value={selectedCustomer === customer.id ? remarkText : ''}\n                        onChange={(e) => {\n                          setSelectedCustomer(customer.id);\n                          setRemarkText(e.target.value);\n                        }}\n                        className=\"flex-1\"\n                        rows={2}\n                      />\n                    </div>\n                    <div className=\"flex gap-2\">\n                      <Input\n                        type=\"file\"\n                        accept=\".pdf,.jpg,.jpeg,.png\"\n                        onChange={(e) => {\n                          setSelectedCustomer(customer.id);\n                          setRemarkFile(e.target.files[0]);\n                        }}\n                        className=\"flex-1\"\n                      />\n                      <Button \n                        onClick={() => handleAddRemark(customer.id)} \n                        disabled={!remarkText.trim() || selectedCustomer !== customer.id}\n                        style={{ background: '#d63031', color: 'white' }}\n                      >\n                        <Plus className=\"mr-2 h-4 w-4\" />\n                        Speichern\n                      </Button>\n                    </div>\n                  </div>\n                </div>\n\n                {remarks[customer.id] && remarks[customer.id].length > 0 ? (\n                  <div className=\"space-y-2 mt-4\">\n                    {remarks[customer.id].map((remark) => (\n                      <div key={remark.id} className=\"p-3 border rounded-lg bg-gray-50\">\n                        <p className=\"text-xs text-gray-500\">{formatDate(remark.date)}</p>\n                        <p className=\"mt-1\">{remark.remarks}</p>\n                        {remark.file_url && (\n                          <a href={`${API.replace('/api', '')}${remark.file_url}`} target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-sm text-blue-600 hover:underline mt-1 inline-block\">\n                            Foto ansehen\n                          </a>\n                        )}\n                      </div>\n                    ))}\n                  </div>\n                ) : (\n                  <p className=\"text-gray-500 text-sm mt-4\">Noch keine Bemerkungen</p>\n                )}\n              </CardContent>\n            </Card>\n          ))}\n\n          {customers.length === 0 && (\n            <Card className=\"border-0 shadow-lg\">\n              <CardContent className=\"py-12 text-center text-gray-500\">\n                Keine Kunden vorhanden\n              </CardContent>\n            </Card>\n          )}\n        </div>\n      </main>\n    </div>\n  );\n}\n\nexport default CustomerManagement;
