import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function Statistics() {
  const { token } = useContext(AuthContext);
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Fahrschule saferide by Nadine Stäubli - Statistik ${currentYear}`, 14, 15);
    
    // Einnahmen Table
    const incomeAccounts = accounts.filter(acc => acc.type === 'income');
    const incomeData = incomeAccounts.map(acc => [
      acc.name,
      `CHF ${acc.income.toFixed(2)}`
    ]);
    incomeData.push(['Total Einnahmen', `CHF ${totalIncome.toFixed(2)}`]);
    
    doc.autoTable({
      head: [['Einnahmen-Konten', 'Betrag']],
      body: incomeData,
      startY: 25,
      theme: 'striped'
    });
    
    // Ausgaben Table
    const expenseAccounts = accounts.filter(acc => acc.type === 'expense');
    const expenseData = expenseAccounts.map(acc => [
      acc.name,
      `CHF ${acc.expense.toFixed(2)}`
    ]);
    expenseData.push(['Total Ausgaben', `CHF ${totalExpense.toFixed(2)}`]);
    
    doc.autoTable({
      head: [['Ausgaben-Konten', 'Betrag']],
      body: expenseData,
      startY: doc.lastAutoTable.finalY + 10,
      theme: 'striped'
    });
    
    doc.save(`statistik_${currentYear}.pdf`);
    toast.success('PDF exportiert');
  };

  if (!yearlyData || !statistics) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Laden...</p>
    </>
  );

  const accounts = Object.entries(yearlyData.account_totals).map(([name, data]) => ({
    name,
    ...data
  }));

  const incomeAccounts = accounts.filter(acc => acc.type === 'income');
  const expenseAccounts = accounts.filter(acc => acc.type === 'expense');

  const totalIncome = accounts.reduce((sum, acc) => sum + acc.income, 0);
  const totalExpense = accounts.reduce((sum, acc) => sum + acc.expense, 0);

  // Prepare chart data - with proper month names
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const monthlyChartData = Object.entries(statistics.monthly_data).map(([monthKey, data]) => {
    const monthNum = parseInt(monthKey.split('-')[1]);
    return {
      month: monthNames[monthNum - 1],
      Einnahmen: data.income,
      Ausgaben: data.expense
    };
  });

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Statistik {currentYear}</h1>
        <Button onClick={handleExportPDF} style={{ background: '#d63031', color: 'white' }}>
          <Download className="mr-2 h-4 w-4" />
          PDF Export
        </Button>
      </>
      
      {/* Year selector */}
      <div className="mb-6">
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
      </>

      {/* Summary Cards - Only Income and Expense */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
      </>

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
              </>
              <div>
                <p className="text-sm text-gray-600">Umsatz Fahrstunden</p>
                <p className="text-2xl font-bold" style={{ color: '#27ae60' }}>
                  CHF {statistics.fahrstunden_revenue.toFixed(2)}
                </p>
              </>
            </>
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
              </>
              <div>
                <p className="text-sm text-gray-600">Ø Ausgaben pro Monat</p>
                <p className="text-2xl font-bold" style={{ color: '#e67e22' }}>
                  CHF {(totalExpense / 12).toFixed(2)}
                </p>
              </>
            </>
          </CardContent>
        </Card>
      </>

      {/* Monthly Chart */}
      <Card className="border-0 shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Monatliche Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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

      {/* Accounts breakdown - Separated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Accounts */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: '#27ae60' }}></span>
              Einnahmen-Konten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#e8f8f5' }}>
                    <TableHead>Konto</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeAccounts.map((account) => (
                    <TableRow key={account.name}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: '#27ae60' }}>
                        CHF {account.income.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow style={{ background: '#e8f8f5' }}>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold" style={{ color: '#27ae60' }}>
                      CHF {totalIncome.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          </CardContent>
        </Card>

        {/* Expense Accounts */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: '#e67e22' }}></span>
              Ausgaben-Konten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#fef5e7' }}>
                    <TableHead>Konto</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseAccounts.map((account) => (
                    <TableRow key={account.name}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: '#e67e22' }}>
                        CHF {account.expense.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow style={{ background: '#fef5e7' }}>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold" style={{ color: '#e67e22' }}>
                      CHF {totalExpense.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          </CardContent>
        </Card>
      </>
    </main>
  );
}

export default Statistics;