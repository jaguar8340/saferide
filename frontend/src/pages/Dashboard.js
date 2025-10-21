import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Plus, Trash2, Upload, Download, Menu, Settings, Users, FileText, BarChart3, Edit2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'income',
    amount: '',
    account_id: '',
    remarks: ''
  });
  const [uploadingFile, setUploadingFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTransaction) {
        await axios.put(`${API}/transactions/${editingTransaction.id}`, formData, {
          headers: { Authorization: token }
        });
        toast.success('Eintrag aktualisiert');
      } else {
        await axios.post(`${API}/transactions`, formData, {
          headers: { Authorization: token }
        });
        toast.success('Eintrag hinzugefügt');
      }
      
      setShowAddDialog(false);
      setEditingTransaction(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'income',
        amount: '',
        account_id: '',
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
      remarks: transaction.remarks || ''
    });
    setShowAddDialog(true);
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

      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#d63031' }}>Saferide</h1>
              <p className="text-sm text-gray-600">Willkommen, {user?.username} ({user?.role})</p>
            </div>
            
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="menu-btn">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/')} data-testid="nav-dashboard">
                    <FileText className="mr-2 h-4 w-4" />
                    Monatsansicht
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/yearly')} data-testid="nav-yearly">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Jahresübersicht
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/accounting')} data-testid="nav-accounting">
                    <FileText className="mr-2 h-4 w-4" />
                    Buchhaltung/Abschluss
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/accounts')} data-testid="nav-accounts">
                        <Settings className="mr-2 h-4 w-4" />
                        Konten verwalten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/users')} data-testid="nav-users">
                        <Users className="mr-2 h-4 w-4" />
                        Benutzer verwalten
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={logout} data-testid="logout-btn">
                    <LogOut className="mr-2 h-4 w-4" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month selector and summary */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
                  data-testid="prev-month-btn"
                >
                  ←
                </Button>
                <CardTitle className="text-2xl" data-testid="current-month">
                  {new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(new Date(year, month, 1))}
                  data-testid="next-month-btn"
                >
                  →
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleExportPDF} variant="outline" data-testid="export-pdf-btn">
                  <Download className="mr-2 h-4 w-4" />
                  PDF Export
                </Button>
                <Dialog open={showAddDialog} onOpenChange={(open) => {
                  setShowAddDialog(open);
                  if (!open) {
                    setEditingTransaction(null);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      description: '',
                      type: 'income',
                      amount: '',
                      account_id: '',
                      remarks: ''
                    });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button style={{ background: '#d63031', color: 'white' }} data-testid="add-transaction-btn">
                      <Plus className="mr-2 h-4 w-4" />
                      Eintrag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
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
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, account_id: '' })}>
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
                            {accounts
                              .filter(acc => acc.type === formData.type)
                              .map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
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
                <p className="text-2xl font-bold" style={{ color: '#27ae60' }} data-testid="total-income">
                  CHF {totalIncome.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: '#fef5e7' }}>
                <p className="text-sm text-gray-600">Total Ausgaben</p>
                <p className="text-2xl font-bold" style={{ color: '#e67e22' }} data-testid="total-expense">
                  CHF {totalExpense.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: totalBalance >= 0 ? '#e8f8f5' : '#fadbd8' }}>
                <p className="text-sm text-gray-600">Total Einkommen</p>
                <p className="text-2xl font-bold" style={{ color: totalBalance >= 0 ? '#27ae60' : '#c0392b' }} data-testid="total-balance">
                  CHF {totalBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions table */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#f8f9fa' }}>
                    <TableHead>Datum</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Konto</TableHead>
                    <TableHead className="text-right">Einnahmen</TableHead>
                    <TableHead className="text-right">Ausgaben</TableHead>
                    <TableHead>Bemerkungen</TableHead>
                    <TableHead>Datei</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} data-testid="transaction-row">
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs" style={{ 
                          background: transaction.type === 'income' ? '#e8f8f5' : '#fef5e7',
                          color: transaction.type === 'income' ? '#27ae60' : '#e67e22'
                        }}>
                          {transaction.account_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" style={{ color: '#27ae60', fontWeight: '600' }}>
                        {transaction.type === 'income' ? `CHF ${transaction.amount.toFixed(2)}` : ''}
                      </TableCell>
                      <TableCell className="text-right" style={{ color: '#e67e22', fontWeight: '600' }}>
                        {transaction.type === 'expense' ? `CHF ${transaction.amount.toFixed(2)}` : ''}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{transaction.remarks || '-'}</TableCell>
                      <TableCell>
                        {transaction.file_url ? (
                          <a href={`${API.replace('/api', '')}${transaction.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            Ansehen
                          </a>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => e.target.files[0] && handleFileUpload(transaction.id, e.target.files[0])}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={uploadingFile === transaction.id}
                            />
                            <Button variant="ghost" size="sm" asChild disabled={uploadingFile === transaction.id}>
                              <span>
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </label>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                            data-testid="edit-transaction-btn"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(transaction.id)}
                            data-testid="delete-transaction-btn"
                          >
                            <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Keine Einträge für diesen Monat
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Dashboard;