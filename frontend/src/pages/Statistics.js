import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Statistics() {
  const { token } = useContext(AuthContext);
  const [yearlyData, setYearlyData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => { fetchYearlyData(); fetchStatistics(); }, [currentYear]);

  const fetchYearlyData = async () => {
    try {
      const response = await axios.get(`${API}/reports/yearly?year=${currentYear}`, { headers: { Authorization: token } });
      setYearlyData(response.data);
    } catch (error) { toast.error('Fehler'); }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/reports/statistics?year=${currentYear}`, { headers: { Authorization: token } });
      setStatistics(response.data);
    } catch (error) { console.error(error); }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Fahrschule saferide by Nadine Staeubli - Statistik ${currentYear}`, 14, 15);
    
    const incomeAccounts = accounts.filter(acc => acc.type === 'income');
    const incomeData = incomeAccounts.map(acc => [acc.name, `CHF ${acc.income.toFixed(2)}`]);
    incomeData.push(['Total Einnahmen', `CHF ${totalIncome.toFixed(2)}`]);
    autoTable(doc, { head: [['Einnahmen-Konten', 'Betrag']], body: incomeData, startY: 25, theme: 'grid' });
    
    const expenseAccounts = accounts.filter(acc => acc.type === 'expense');
    const expenseData = expenseAccounts.map(acc => [acc.name, `CHF ${acc.expense.toFixed(2)}`]);
    expenseData.push(['Total Ausgaben', `CHF ${totalExpense.toFixed(2)}`]);
    autoTable(doc, { head: [['Ausgaben-Konten', 'Betrag']], body: expenseData, startY: doc.lastAutoTable.finalY + 10, theme: 'grid' });
    
    doc.save(`statistik_${currentYear}.pdf`);
    toast.success('PDF exportiert');
  };

  if (!yearlyData || !statistics) return <main className="max-w-7xl mx-auto p-8"><p>Laden...</p></main>;

  const accounts = Object.entries(yearlyData.account_totals).map(([name, data]) => ({ name, ...data }));
  const incomeAccounts = accounts.filter(acc => acc.type === 'income');
  const expenseAccounts = accounts.filter(acc => acc.type === 'expense');
  const totalIncome = accounts.reduce((sum, acc) => sum + acc.income, 0);
  const totalExpense = accounts.reduce((sum, acc) => sum + acc.expense, 0);

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const monthlyChartData = [];
  
  for (let i = 1; i <= 12; i++) {
    const monthKey = `${currentYear}-${String(i).padStart(2, '0')}`;
    const data = statistics.monthly_data[monthKey] || { income: 0, expense: 0 };
    monthlyChartData.push({
      month: monthNames[i - 1],
      Einnahmen: data.income,
      Ausgaben: data.expense
    });
  }

  console.log('Chart Data:', monthlyChartData);
  console.log('Statistics:', statistics);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Statistik {currentYear}</h1>
        <Button onClick={handleExportPDF} style={{ background: '#d63031', color: 'white' }}><Download className="mr-2 h-4 w-4" />PDF Export</Button>
      </div>
      
      <div className="mb-6"><Select value={currentYear.toString()} onValueChange={(value) => setCurrentYear(parseInt(value))}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{years.map(year => (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>))}</SelectContent></Select></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="text-lg">Total Einnahmen</CardTitle></CardHeader><CardContent><p className="text-2xl sm:text-3xl font-bold" style={{ color: '#27ae60' }}>CHF {formatCurrency(totalIncome)}</p></CardContent></Card>
        <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="text-lg">Total Ausgaben</CardTitle></CardHeader><CardContent><p className="text-2xl sm:text-3xl font-bold" style={{ color: '#e67e22' }}>CHF {formatCurrency(totalExpense)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="text-base sm:text-lg">Fahrstunden Statistik</CardTitle></CardHeader><CardContent><div className="space-y-2 sm:space-y-3"><div><p className="text-xs sm:text-sm text-gray-600">Anzahl verkaufte Fahrstunden</p><p className="text-xl sm:text-2xl font-bold" style={{ color: '#d63031' }}>{statistics.fahrstunden_count || 0}</p></div><div><p className="text-xs sm:text-sm text-gray-600">Umsatz Fahrstunden</p><p className="text-xl sm:text-2xl font-bold" style={{ color: '#27ae60' }}>CHF {formatCurrency(statistics.fahrstunden_revenue || 0)}</p></div></div></CardContent></Card>
        <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="text-base sm:text-lg">Durchschnittlicher Monatsumsatz</CardTitle></CardHeader><CardContent><div className="space-y-2 sm:space-y-3"><div><p className="text-xs sm:text-sm text-gray-600">Ø Einnahmen pro Monat</p><p className="text-xl sm:text-2xl font-bold" style={{ color: '#27ae60' }}>CHF {formatCurrency(totalIncome / 12)}</p></div><div><p className="text-xs sm:text-sm text-gray-600">Ø Ausgaben pro Monat</p><p className="text-xl sm:text-2xl font-bold" style={{ color: '#e67e22' }}>CHF {formatCurrency(totalExpense / 12)}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><span className="w-3 h-3 rounded-full" style={{ background: '#27ae60' }}></span>Einnahmen-Konten</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-green-50"><th className="p-2 sm:p-3 text-left text-xs sm:text-sm">Konto</th><th className="p-2 sm:p-3 text-right text-xs sm:text-sm">Betrag</th></tr></thead><tbody>{incomeAccounts.map(acc => (<tr key={acc.name} className="border-b"><td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{acc.name}</td><td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm" style={{ color: '#27ae60' }}>CHF {formatCurrency(acc.income)}</td></tr>))}<tr className="bg-green-50"><td className="p-2 sm:p-3 font-bold text-xs sm:text-sm">Total</td><td className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm" style={{ color: '#27ae60' }}>CHF {formatCurrency(totalIncome)}</td></tr></tbody></table></div></CardContent></Card>
        <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><span className="w-3 h-3 rounded-full" style={{ background: '#e67e22' }}></span>Ausgaben-Konten</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-orange-50"><th className="p-2 sm:p-3 text-left text-xs sm:text-sm">Konto</th><th className="p-2 sm:p-3 text-right text-xs sm:text-sm">Betrag</th></tr></thead><tbody>{expenseAccounts.map(acc => (<tr key={acc.name} className="border-b"><td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{acc.name}</td><td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm" style={{ color: '#e67e22' }}>CHF {formatCurrency(acc.expense)}</td></tr>))}<tr className="bg-orange-50"><td className="p-2 sm:p-3 font-bold text-xs sm:text-sm">Total</td><td className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm" style={{ color: '#e67e22' }}>CHF {formatCurrency(totalExpense)}</td></tr></tbody></table></div></CardContent></Card>
      </div>
    </main>
  );
}

export default Statistics;
