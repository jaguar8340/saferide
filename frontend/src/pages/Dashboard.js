import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { TransactionTabs } from '../components/TransactionTabs';
import { ModernMonthYearPicker } from '../components/ModernMonthYearPicker';
import { Navigation } from '../components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Trash2, Upload, Download, Menu, Settings, Users, FileText, BarChart3, Edit2, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDate, getCurrentDateISO, getMonthKey } from '../utils/dateUtils';

function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [bankDocuments, setBankDocuments] = useState([]);
  const [miscItems, setMiscItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    date: getCurrentDateISO(),
    description: '',
    type: 'income',
    amount: '',
    account_id: '',
    payment_method: '',
    remarks: ''
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthKey = getMonthKey(year, month);

  useEffect(() => {
    fetchAccounts();
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
      console.error('Fehler beim Laden der Bankbelege:', error);
    }
  };

  const fetchMiscItems = async () => {
    try {
      const response = await axios.get(`${API}/misc-items?month=${monthKey}`, {
        headers: { Authorization: token }
      });
      setMiscItems(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Diverses-Einträge:', error);
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

      // Upload file if selected
      if (uploadFile && transactionId) {
        const fileFormData = new FormData();
        fileFormData.append('file', uploadFile);
        await axios.post(`${API}/upload/${transactionId}`, fileFormData, {
          headers: { Authorization: token }
        });
      }
      
      setShowAddDialog(false);
      setEditingTransaction(null);
      setUploadFile(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'income',
        amount: '',
        account_id: '',
        payment_method: '',
        remarks: ''
      });
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
      await axios.delete(`${API}/transactions/${deleteConfirm}`, {
        headers: { Authorization: token }
      });
      toast.success('Eintrag gelöscht');
      fetchTransactions();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleFileUpload = async (transactionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploadingFile(transactionId);

    try {
      await axios.post(`${API}/upload/${transactionId}`, formData, {
        headers: { Authorization: token }
      });
      toast.success('Datei hochgeladen');
      fetchTransactions();
    } catch (error) {
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.get(
        `${API}/reports/export-pdf?year=${year}&month=${month}`,
        {
          headers: { Authorization: token },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `saferide_${year}_${month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exportiert');
    } catch (error) {
      toast.error('Fehler beim Export');
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date,
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount.toString(),
      account_id: transaction.account_id,
      payment_method: transaction.payment_method || '',
      remarks: transaction.remarks || ''
    });
    setShowAddDialog(true);
  };

  // Bank documents handlers
  const handleAddBankDocument = async (file) => {
    try {
      const response = await axios.post(`${API}/bank-documents`, {
        date: getCurrentDateISO(),
        month: monthKey
      }, {
        headers: { Authorization: token }
      });

      const docId = response.data.id;
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/bank-documents/${docId}/upload`, formData, {
        headers: { Authorization: token }
      });
      
      toast.success('Bankbeleg hochgeladen');
      fetchBankDocuments();
    } catch (error) {
      toast.error('Fehler beim Hochladen');
    }
  };

  const handleDeleteBankDocument = async (docId) => {
    try {
      await axios.delete(`${API}/bank-documents/${docId}`, {
        headers: { Authorization: token }
      });
      toast.success('Bankbeleg gelöscht');
      fetchBankDocuments();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Misc items handlers
  const handleAddMiscItem = async (remarks, file) => {
    if (!remarks.trim()) {
      toast.error('Bitte Bemerkungen eingeben');
      return;
    }

    try {
      const response = await axios.post(`${API}/misc-items`, {
        date: getCurrentDateISO(),
        month: monthKey,
        remarks
      }, {
        headers: { Authorization: token }
      });

      if (file) {
        const itemId = response.data.id;
        const formData = new FormData();
        formData.append('file', file);
        
        await axios.post(`${API}/misc-items/${itemId}/upload`, formData, {
          headers: { Authorization: token }
        });
      }
      
      toast.success('Diverses-Eintrag hinzugefügt');
      fetchMiscItems();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteMiscItem = async (itemId) => {
    try {
      await axios.delete(`${API}/misc-items/${itemId}`, {
        headers: { Authorization: token }
      });
      toast.success('Diverses-Eintrag gelöscht');
      fetchMiscItems();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };


  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#d63031', color: 'white' }}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Month selector */}
        <ModernMonthYearPicker 
          currentDate={currentDate} 
          onDateChange={setCurrentDate}
        />

        {/* Summary and actions */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-xl sm:text-2xl">
                {new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </CardTitle>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button onClick={handleExportPDF} variant="outline" data-testid="export-pdf-btn" className="flex-1 sm:flex-none">
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">PDF Export</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                <Dialog open={showAddDialog} onOpenChange={(open) => {
                  setShowAddDialog(open);
                  if (!open) {
                    setEditingTransaction(null);
                    setUploadFile(null);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      description: '',
                      type: 'income',
                      amount: '',
                      account_id: '',
                      payment_method: '',
                      remarks: ''
                    });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button style={{ background: '#d63031', color: 'white' }} data-testid="add-transaction-btn" className="flex-1 sm:flex-none">
                      <Plus className="mr-2 h-4 w-4" />
                      Eintrag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingTransaction ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label>Datum</Label>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                          data-testid="transaction-date-input"
                        />
                      </div>
                      <div>
                        <Label>Bezeichnung</Label>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                          data-testid="transaction-description-input"
                        />
                      </div>
                      <div>
                        <Label>Typ</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                          <SelectTrigger data-testid="transaction-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Einnahmen</SelectItem>
                            <SelectItem value="expense">Ausgaben</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Betrag (CHF)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                          data-testid="transaction-amount-input"
                        />
                      </div>
                      <div>
                        <Label>Konto</Label>
                        <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                          <SelectTrigger data-testid="transaction-account-select">
                            <SelectValue placeholder="Konto auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Bezahlung</Label>
                        <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                          <SelectTrigger data-testid="transaction-payment-select">
                            <SelectValue placeholder="Bezahlmethode wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="kreditkarte">Kreditkarte</SelectItem>
                            <SelectItem value="twint">Twint</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Bemerkungen</Label>
                        <Textarea
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          data-testid="transaction-remarks-input"
                        />
                      </div>
                      <div>
                        <Label>Datei (optional)</Label>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadFile(e.target.files[0])}
                          data-testid="transaction-file-input"
                        />
                        {uploadFile && (
                          <p className="text-sm text-gray-600 mt-1">{uploadFile.name}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={loading} data-testid="submit-transaction-btn">
                        {loading ? 'Speichern...' : (editingTransaction ? 'Aktualisieren' : 'Hinzufügen')}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ background: '#e8f8f5' }}>
                <p className="text-sm text-gray-600">Total Einnahmen</p>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: '#27ae60' }} data-testid="total-income">
                  CHF {totalIncome.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: '#fef5e7' }}>
                <p className="text-sm text-gray-600">Total Ausgaben</p>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: '#e67e22' }} data-testid="total-expense">
                  CHF {totalExpense.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: totalBalance >= 0 ? '#e8f8f5' : '#fadbd8' }}>
                <p className="text-sm text-gray-600">Total Einkommen</p>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: totalBalance >= 0 ? '#27ae60' : '#c0392b' }} data-testid="total-balance">
                  CHF {totalBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Tabs */}
        <TransactionTabs
          transactions={transactions}
          bankDocuments={bankDocuments}
          miscItems={miscItems}
          handleEdit={handleEdit}
          setDeleteConfirm={setDeleteConfirm}
          handleFileUpload={handleFileUpload}
          uploadingFile={uploadingFile}
          handleAddBankDocument={handleAddBankDocument}
          handleDeleteBankDocument={handleDeleteBankDocument}
          handleAddMiscItem={handleAddMiscItem}
          handleDeleteMiscItem={handleDeleteMiscItem}
          API={API}
        />
      </main>
    </div>
  );
}

export default Dashboard;