import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

function AccountingReport() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [yearlyData, setYearlyData] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchYearlyData();
  }, [currentYear]);

  const fetchYearlyData = async () => {
    try {
      const response = await axios.get(`${API}/reports/yearly?year=${currentYear}`, {
        headers: { Authorization: token }
      });
      setYearlyData(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    }
  };

  if (!yearlyData) return <div>Laden...</div>;

  const accounts = Object.entries(yearlyData.account_totals).map(([name, data]) => ({
    name,
    ...data
  }));

  const totalIncome = accounts.reduce((sum, acc) => sum + acc.income, 0);
  const totalExpense = accounts.reduce((sum, acc) => sum + acc.expense, 0);
  const totalBalance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-btn">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold" style={{ color: '#d63031' }}>Buchhaltung/Abschluss {currentYear}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Year selector */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => setCurrentYear(currentYear - 1)} data-testid="prev-year-btn">
            ←
          </Button>
          <h2 className="text-2xl font-bold" data-testid="current-year">{currentYear}</h2>
          <Button variant="outline" onClick={() => setCurrentYear(currentYear + 1)} data-testid="next-year-btn">
            →
          </Button>
        </div>

        {/* Summary */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Jahres-Zusammenfassung</CardTitle>
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
                <p className="text-sm text-gray-600">Gesamt-Bilanz</p>
                <p className="text-2xl font-bold" style={{ color: totalBalance >= 0 ? '#27ae60' : '#c0392b' }} data-testid="total-balance">
                  CHF {totalBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts breakdown */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Konten-Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#f8f9fa' }}>
                    <TableHead>Konto</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Einnahmen</TableHead>
                    <TableHead className="text-right">Ausgaben</TableHead>
                    <TableHead className="text-right">Gesamt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const balance = account.income - account.expense;
                    return (
                      <TableRow key={account.name} data-testid="account-row">
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs" style={{ 
                            background: account.type === 'income' ? '#e8f8f5' : '#fef5e7',
                            color: account.type === 'income' ? '#27ae60' : '#e67e22'
                          }}>
                            {account.type === 'income' ? 'Einnahmen' : 'Ausgaben'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" style={{ color: '#27ae60', fontWeight: '600' }}>
                          {account.income > 0 ? `CHF ${account.income.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right" style={{ color: '#e67e22', fontWeight: '600' }}>
                          {account.expense > 0 ? `CHF ${account.expense.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold" style={{ color: balance >= 0 ? '#27ae60' : '#c0392b' }}>
                          CHF {balance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Keine Daten für dieses Jahr
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

export default AccountingReport;