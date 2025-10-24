import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Upload, Download, Edit2, FileText, Calendar } from 'lucide-react';
import { formatDate, getCurrentDateISO, getMonthKey } from '../utils/dateUtils';

function Dashboard() {
  const { token } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [bankDocuments, setBankDocuments] = useState([]);
  const [miscItems, setMiscItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [useCustomer, setUseCustomer] = useState(false);
  const [formData, setFormData] = useState({
    date: getCurrentDateISO(),
    description: '',
    customer_id: '',
    type: 'income',
    amount: '',
    account_id: '',
    payment_method: '',
    remarks: ''
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthKey = getMonthKey(year, month);
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchAccounts();
    fetchCustomers();
    fetchTransactions();
    fetchBankDocuments();
    fetchMiscItems();
  }, [currentDate]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Konten');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, { headers: { Authorization: token } });
      setCustomers(response.data.filter(c => c.active !== false));
    } catch (error) {
      console.error('Fehler:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions?year=${year}&month=${month}`, {
        headers: { Authorization: token }
      });
      setTransactions(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Einträge');
    }
  };

  const fetchBankDocuments = async () => {
    try {
      const response = await axios.get(`${API}/bank-documents?month=${monthKey}`, {
        headers: { Authorization: token }
      });
      setBankDocuments(response.data);
    } catch (error) {
      console.error('Fehler:', error);
    }
  };

  const fetchMiscItems = async () => {
    try {
      const response = await axios.get(`${API}/misc-items?month=${monthKey}`, {
        headers: { Authorization: token }
      });
      setMiscItems(response.data);
    } catch (error) {
      console.error('Fehler:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let transactionId;
      
      if (editingTransaction) {
        await axios.put(`${API}/transactions/${editingTransaction.id}`, formData, {
          headers: { Authorization: token }
        });
        toast.success('Eintrag aktualisiert');
        transactionId = editingTransaction.id;
      } else {
        const response = await axios.post(`${API}/transactions`, formData, {
          headers: { Authorization: token }
        });
        toast.success('Eintrag hinzugefügt');
        transactionId = response.data.id;
      }

      if (uploadFile && transactionId) {
        const fileFormData = new FormData();
        fileFormData.append('file', uploadFile);
        try {
          await axios.post(`${API}/upload/${transactionId}`, fileFormData, {
            headers: { Authorization: token }
          });
          toast.success('Datei hochgeladen');
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Fehler beim Datei-Upload: ' + (uploadError.response?.data?.detail || uploadError.message));
        }
      }
      
      setShowAddDialog(false);
      setEditingTransaction(null);
      setUploadFile(null);
      setFormData({ date: getCurrentDateISO(), description: '', type: 'income', amount: '', account_id: '', payment_method: '', remarks: '' });
      fetchTransactions();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`${API}/transactions/${deleteConfirm}`, { headers: { Authorization: token } });
      toast.success('Eintrag gelöscht');
      fetchTransactions();
    } catch (error) {
      toast.error('Fehler');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      // Client-side PDF generation to avoid emergent-main.js interference
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF({ orientation: 'landscape' });
      
      doc.setFontSize(14);
      doc.text(`Fahrschule saferide by Nadine Staeubli - ${months[month - 1]} ${year}`, 14, 15);
      
      // Prepare table data
      const tableData = transactions.map(t => [
        formatDate(t.date),
        t.description,
        t.account_name || '',
        t.payment_method || '-',
        t.type === 'income' ? `CHF ${t.amount.toFixed(2)}` : '',
        t.type === 'expense' ? `CHF ${t.amount.toFixed(2)}` : '',
        (t.remarks || '').substring(0, 30)
      ]);
      
      tableData.push(['', '', 'Total:', '', `CHF ${totalIncome.toFixed(2)}`, `CHF ${totalExpense.toFixed(2)}`, '']);
      tableData.push(['', '', 'Einkommen:', '', '', `CHF ${totalBalance.toFixed(2)}`, '']);
      
      autoTable(doc, {
        head: [['Datum', 'Bezeichnung', 'Konto', 'Bezahlung', 'Einnahmen', 'Ausgaben', 'Bemerkungen']],
        body: tableData,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fontSize: 9, fillColor: [128, 128, 128] }
      });
      
      doc.save(`saferide_${year}_${month}.pdf`);
      toast.success('PDF exportiert');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Fehler beim Export');
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>Möchten Sie diesen Eintrag wirklich löschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#d63031', color: 'white' }}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mb-6 border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: '#d63031' }} />
              <span className="text-sm font-medium text-gray-600">Zeitraum wählen:</span>
            </div>
            <Select value={month.toString()} onValueChange={(value) => setCurrentDate(new Date(year, parseInt(value) - 1, 1))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, idx) => (
                  <SelectItem key={idx + 1} value={(idx + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(value) => setCurrentDate(new Date(parseInt(value), month - 1, 1))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="mb-6 border-0 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle className="text-xl sm:text-2xl">{months[month - 1]} {year}</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExportPDF} variant="outline"><Download className="mr-2 h-4 w-4" />PDF Export</Button>
              <Dialog open={showAddDialog} onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) { setEditingTransaction(null); setUploadFile(null); setFormData({ date: getCurrentDateISO(), description: '', type: 'income', amount: '', account_id: '', payment_method: '', remarks: '' }); }
              }}>
                <DialogTrigger asChild>
                  <Button style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Eintrag</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingTransaction ? 'Bearbeiten' : 'Neuer Eintrag'}</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label>Datum</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={useCustomer} onChange={(e) => setUseCustomer(e.target.checked)} className="mr-2" />
                      <Label>Kunde aus Liste wählen</Label>
                    </div>
                    {useCustomer ? (
                      <div><Label>Kunde</Label>
                        <Select value={formData.customer_id} onValueChange={(value) => {
                          const customer = customers.find(c => c.id === value);
                          setFormData({ ...formData, customer_id: value, description: customer ? `${customer.vorname} ${customer.name}` : '' });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Kunde wählen" /></SelectTrigger>
                          <SelectContent>{customers.map(c => (<SelectItem key={c.id} value={c.id}>{c.vorname} {c.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div><Label>Bezeichnung</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required /></div>
                    )}
                    <div><Label>Typ</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="income">Einnahmen</SelectItem><SelectItem value="expense">Ausgaben</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Betrag (CHF)</Label><Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required /></div>
                    <div><Label>Konto</Label>
                      <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Konto wählen" /></SelectTrigger>
                        <SelectContent>{accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Bezahlung</Label>
                      <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                        <SelectTrigger><SelectValue placeholder="Bezahlmethode" /></SelectTrigger>
                        <SelectContent><SelectItem value="bar">Bar</SelectItem><SelectItem value="kreditkarte">Kreditkarte</SelectItem><SelectItem value="twint">Twint</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Bemerkungen</Label><Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} /></div>
                    <div><Label>Datei (optional)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setUploadFile(e.target.files[0])} />{uploadFile && <p className="text-sm mt-1">{uploadFile.name}</p>}</div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Speichern...' : 'Speichern'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ background: '#e8f8f5' }}><p className="text-sm text-gray-600">Total Einnahmen</p><p className="text-2xl font-bold" style={{ color: '#27ae60' }}>CHF {totalIncome.toFixed(2)}</p></div>
            <div className="p-4 rounded-lg" style={{ background: '#fef5e7' }}><p className="text-sm text-gray-600">Total Ausgaben</p><p className="text-2xl font-bold" style={{ color: '#e67e22' }}>CHF {totalExpense.toFixed(2)}</p></div>
            <div className="p-4 rounded-lg" style={{ background: totalBalance >= 0 ? '#e8f8f5' : '#fadbd8' }}><p className="text-sm text-gray-600">Total Einkommen</p><p className="text-2xl font-bold" style={{ color: totalBalance >= 0 ? '#27ae60' : '#c0392b' }}>CHF {totalBalance.toFixed(2)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="transactions">Einträge</TabsTrigger>
          <TabsTrigger value="bank">Bankbelege</TabsTrigger>
          <TabsTrigger value="misc">Diverses</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b bg-gray-50"><th className="p-3 text-left text-sm">Datum</th><th className="p-3 text-left text-sm">Bezeichnung</th><th className="p-3 text-left text-sm">Konto</th><th className="p-3 text-left text-sm">Bezahlung</th><th className="p-3 text-right text-sm">Einnahmen</th><th className="p-3 text-right text-sm">Ausgaben</th><th className="p-3 text-left text-sm">Bemerkungen</th><th className="p-3 text-center text-sm">Datei</th><th className="p-3 text-center text-sm">Aktionen</th></tr></thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{formatDate(t.date)}</td>
                        <td className="p-3 text-sm">{t.description}</td>
                        <td className="p-3"><span className="px-2 py-1 rounded text-xs" style={{ background: t.type === 'income' ? '#e8f8f5' : '#fef5e7', color: t.type === 'income' ? '#27ae60' : '#e67e22' }}>{t.account_name}</span></td>
                        <td className="p-3 text-sm capitalize">{t.payment_method || '-'}</td>
                        <td className="p-3 text-right font-semibold" style={{ color: '#27ae60' }}>{t.type === 'income' ? `CHF ${t.amount.toFixed(2)}` : ''}</td>
                        <td className="p-3 text-right font-semibold" style={{ color: '#e67e22' }}>{t.type === 'expense' ? `CHF ${t.amount.toFixed(2)}` : ''}</td>
                        <td className="p-3 text-sm text-gray-600">{t.remarks || '-'}</td>
                        <td className="p-3 text-center">
                          {t.file_url ? (
                            <a href={`${API.replace('/api', '')}${t.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Ansehen</a>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingTransaction(t); setFormData({ date: t.date, description: t.description, type: t.type, amount: t.amount.toString(), account_id: t.account_id, payment_method: t.payment_method || '', remarks: t.remarks || '' }); setShowAddDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(t.id)}><Trash2 className="h-4 w-4" style={{ color: '#d63031' }} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan="8" className="p-8 text-center text-gray-500">Keine Einträge</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><BankTab monthKey={monthKey} bankDocuments={bankDocuments} fetchBankDocuments={fetchBankDocuments} token={token} API={API} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="misc">
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><MiscTab monthKey={monthKey} miscItems={miscItems} fetchMiscItems={fetchMiscItems} token={token} API={API} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function BankTab({ monthKey, bankDocuments, fetchBankDocuments, token, API }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    
    try {
      let successCount = 0;
      
      for (const file of files) {
        try {
          const res = await axios.post(`${API}/bank-documents`, { date: getCurrentDateISO(), month: monthKey }, { headers: { Authorization: token } });
          const fd = new FormData();
          fd.append('file', file);
          await axios.post(`${API}/bank-documents/${res.data.id}/upload`, fd, { headers: { Authorization: token } });
          successCount++;
        } catch (e) {
          console.error('Upload error:', e);
        }
      }
      
      toast.success(`${successCount} Datei(en) hochgeladen`);
      setFiles([]);
      fetchBankDocuments();
    } catch (e) {
      toast.error('Fehler beim Upload');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDelete = async (docId) => {
    try {
      await axios.delete(`${API}/bank-documents/${docId}`, { headers: { Authorization: token } });
      toast.success('Geloescht');
      fetchBankDocuments();
    } catch (e) {
      toast.error('Fehler beim Loeschen');
    }
  };
  
  return (
    <div>
      <div className="mb-4">
        <Label className="block mb-2 font-semibold">Bankbelege hochladen</Label>
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer">
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors" style={{ borderColor: '#d63031' }}>
              <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: '#d63031' }} />
              <p className="text-sm font-medium" style={{ color: '#d63031' }}>
                Klicken oder Dateien hierher ziehen
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (mehrere möglich)</p>
              {files.length > 0 && (
                <p className="text-sm font-semibold mt-2 text-green-600">{files.length} Datei(en) ausgewählt</p>
              )}
            </div>
            <Input 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png" 
              multiple 
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="hidden"
            />
          </label>
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || uploading}
            size="lg"
            style={{ background: '#d63031', color: 'white', minWidth: '150px' }}
          >
            <Upload className="mr-2 h-5 w-5" />
            {uploading ? 'Wird hochgeladen...' : files.length > 0 ? `${files.length} hochladen` : 'Hochladen'}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {bankDocuments.map(d => (
          <div key={d.id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="text-xs text-gray-500">{formatDate(d.date)}</p>
              <p className="font-medium mt-1">{d.filename || 'Bankbeleg'}</p>
              {d.file_url && (
                <a href={`${API.replace('/api', '')}${d.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Ansehen
                </a>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}>
              <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
            </Button>
          </div>
        ))}
        {bankDocuments.length === 0 && <p className="text-center py-8 text-gray-500">Keine Bankbelege</p>}
      </div>
    </div>
  );
}

function MiscTab({ monthKey, miscItems, fetchMiscItems, token, API }) {
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const handleAdd = async () => {
    if (!remarks.trim()) {
      toast.error('Bitte Bemerkung eingeben');
      return;
    }
    
    setUploading(true);
    
    try {
      if (files.length === 0) {
        // No files - just create remark
        await axios.post(`${API}/misc-items`, { date: getCurrentDateISO(), month: monthKey, remarks }, { headers: { Authorization: token } });
        toast.success('Hinzugefuegt');
      } else {
        // Create one misc item per file
        let successCount = 0;
        
        for (const file of files) {
          try {
            const res = await axios.post(`${API}/misc-items`, { date: getCurrentDateISO(), month: monthKey, remarks }, { headers: { Authorization: token } });
            const fd = new FormData();
            fd.append('file', file);
            await axios.post(`${API}/misc-items/${res.data.id}/upload`, fd, { headers: { Authorization: token } });
            successCount++;
          } catch (e) {
            console.error('Upload error:', e);
          }
        }
        
        toast.success(`${successCount} Eintrag/Eintraege hinzugefuegt`);
      }
      
      setRemarks('');
      setFiles([]);
      fetchMiscItems();
    } catch (e) {
      toast.error('Fehler');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API}/misc-items/${itemId}`, { headers: { Authorization: token } });
      toast.success('Geloescht');
      fetchMiscItems();
    } catch (e) {
      toast.error('Fehler beim Loeschen');
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <Label className="block mb-2 font-semibold">Diverses hochladen</Label>
        <Textarea 
          placeholder="Bemerkungen eingeben..." 
          value={remarks} 
          onChange={(e) => setRemarks(e.target.value)}
          className="mb-3"
          rows={3}
        />
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer">
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors" style={{ borderColor: '#9b59b6' }}>
              <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: '#9b59b6' }} />
              <p className="text-sm font-medium" style={{ color: '#9b59b6' }}>
                Klicken oder Dateien hierher ziehen
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (mehrere möglich)</p>
              {files.length > 0 && (
                <p className="text-sm font-semibold mt-2 text-green-600">{files.length} Datei(en) ausgewählt</p>
              )}
            </div>
            <Input 
              type="file" 
              multiple 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="hidden"
            />
          </label>
          <Button 
            onClick={handleAdd} 
            disabled={!remarks.trim() || uploading}
            size="lg"
            style={{ background: '#9b59b6', color: 'white', minWidth: '150px' }}
          >
            <Plus className="mr-2 h-5 w-5" />
            {uploading ? 'Wird hochgeladen...' : files.length > 0 ? `${files.length} hinzufügen` : 'Hinzufügen'}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {miscItems.map(item => (
          <div key={item.id} className="flex justify-between items-center p-3 border rounded">
            <div className="flex-1">
              <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
              <p className="mt-1">{item.remarks}</p>
              {item.filename && <p className="text-sm font-medium text-gray-700 mt-1">📎 {item.filename}</p>}
              {item.file_url && (
                <a href={`${API.replace('/api', '')}${item.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Datei ansehen
                </a>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
              <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
            </Button>
          </div>
        ))}
        {miscItems.length === 0 && <p className="text-center py-8 text-gray-500">Keine Einträge</p>}
      </div>
    </div>
  );
}

export default Dashboard;