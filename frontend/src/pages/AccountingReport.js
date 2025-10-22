import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function AccountingReport() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [yearlyData, setYearlyData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchYearlyData();
    fetchStatistics();
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

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/reports/statistics?year=${currentYear}`, {
        headers: { Authorization: token }
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  if (!yearlyData || !statistics) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Laden...</p>
    </div>
  );

  const accounts = Object.entries(yearlyData.account_totals).map(([name, data]) => ({
    name,
    ...data
  }));

  const totalIncome = accounts.reduce((sum, acc) => sum + acc.income, 0);
  const totalExpense = accounts.reduce((sum, acc) => sum + acc.expense, 0);
  const totalBalance = totalIncome - totalExpense;

  // Prepare chart data
  const monthlyChartData = Object.entries(statistics.monthly_data).map(([month, data]) => ({
    month: month.split('-')[1],
    Einnahmen: data.income,
    Ausgaben: data.expense
  }));

  const paymentMethodData = Object.entries(statistics.payment_methods)
    .filter(([method]) => method && method !== 'null')
    .map(([method, amount]) => ({
      name: method === 'bar' ? 'Bar' : 
            method === 'kreditkarte' ? 'Kreditkarte' : 
            method === 'twint' ? 'Twint' : 
            method === 'bank' ? 'Bank' : method,
      value: amount
    }));

  const COLORS = ['#d63031', '#e67e22', '#27ae60', '#3498db', '#9b59b6'];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-btn">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Buchhaltung/Abschluss {currentYear}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Year selector */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={currentYear.toString()} onValueChange={(value) => setCurrentYear(parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Total Einnahmen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: '#27ae60' }}>
                CHF {totalIncome.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Total Ausgaben</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: '#e67e22' }}>
                CHF {totalExpense.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Gesamt-Bilanz</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: totalBalance >= 0 ? '#27ae60' : '#c0392b' }}>
                CHF {totalBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Fahrstunden Statistik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Anzahl verkaufte Fahrstunden</p>
                  <p className="text-2xl font-bold" style={{ color: '#d63031' }}>
                    {statistics.fahrstunden_count}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Umsatz Fahrstunden</p>
                  <p className="text-2xl font-bold" style={{ color: '#27ae60' }}>
                    CHF {statistics.fahrstunden_revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Durchschnittlicher Monatsumsatz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Ø Einnahmen pro Monat</p>
                  <p className="text-2xl font-bold" style={{ color: '#27ae60' }}>
                    CHF {(totalIncome / 12).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ø Ausgaben pro Monat</p>
                  <p className="text-2xl font-bold" style={{ color: '#e67e22' }}>
                    CHF {(totalExpense / 12).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Bar Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Monatliche Übersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Einnahmen" fill="#27ae60" />
                  <Bar dataKey="Ausgaben" fill="#e67e22" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods Pie Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Zahlungsmethoden</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

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
                      <TableRow key={account.name}>
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
