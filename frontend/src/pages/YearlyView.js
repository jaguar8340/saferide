import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function YearlyView() {
  const { token } = useContext(AuthContext);
  const [yearlyData, setYearlyData] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchYearlyData();
  }, [currentYear]);

  const fetchYearlyData = async () => {
    try {
      const response = await axios.get(`${API}/reports/yearly?year=${currentYear}`, { headers: { Authorization: token } });
      setYearlyData(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden');
    }
  };

  if (!yearlyData) return <main className="max-w-7xl mx-auto p-8"><p>Laden...</p></main>;

  const yearTotalIncome = Object.values(yearlyData.monthly_totals).reduce((sum, m) => sum + m.income, 0);
  const yearTotalExpense = Object.values(yearlyData.monthly_totals).reduce((sum, m) => sum + m.expense, 0);
  const yearTotalBalance = yearTotalIncome - yearTotalExpense;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Fahrschule saferide by Nadine Staeubli - Jahresuebersicht ${currentYear}`, 14, 15);
    
    const monthlyData = months.map((m, idx) => {
      const monthKey = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      const data = yearlyData.monthly_totals[monthKey] || { income: 0, expense: 0, total: 0 };
      return [m, `CHF ${data.income.toFixed(2)}`, `CHF ${data.expense.toFixed(2)}`, `CHF ${data.total.toFixed(2)}`];
    });
    
    monthlyData.push(['', '', '', '']);
    monthlyData.push(['Total', `CHF ${yearTotalIncome.toFixed(2)}`, `CHF ${yearTotalExpense.toFixed(2)}`, `CHF ${yearTotalBalance.toFixed(2)}`]);
    
    autoTable(doc, {
      head: [['Monat', 'Einnahmen', 'Ausgaben', 'Einkommen']],
      body: monthlyData,
      startY: 25
    });
    
    doc.save(`jahresuebersicht_${currentYear}.pdf`);
    toast.success('PDF exportiert');
  };


  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Jahresübersicht {currentYear}</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} style={{ background: '#d63031', color: 'white' }}><Download className="mr-2 h-4 w-4" />PDF Export</Button>
          <Select value={currentYear.toString()} onValueChange={(value) => setCurrentYear(parseInt(value))}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-6 border-0 shadow-lg"><CardHeader><CardTitle>Jahres-Total</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="p-4 rounded-lg" style={{ background: '#e8f8f5' }}><p className="text-sm text-gray-600">Total Einnahmen</p><p className="text-2xl font-bold" style={{ color: '#27ae60' }}>CHF {yearTotalIncome.toFixed(2)}</p></div><div className="p-4 rounded-lg" style={{ background: '#fef5e7' }}><p className="text-sm text-gray-600">Total Ausgaben</p><p className="text-2xl font-bold" style={{ color: '#e67e22' }}>CHF {yearTotalExpense.toFixed(2)}</p></div><div className="p-4 rounded-lg" style={{ background: yearTotalBalance >= 0 ? '#e8f8f5' : '#fadbd8' }}><p className="text-sm text-gray-600">Total Einkommen</p><p className="text-2xl font-bold" style={{ color: yearTotalBalance >= 0 ? '#27ae60' : '#c0392b' }}>CHF {yearTotalBalance.toFixed(2)}</p></div></div></CardContent></Card>

      <Card className="border-0 shadow-lg"><CardHeader><CardTitle>Monatliche Übersicht</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">Monat</th><th className="p-3 text-right">Einnahmen</th><th className="p-3 text-right">Ausgaben</th><th className="p-3 text-right">Einkommen</th></tr></thead><tbody>{months.map((m, idx) => { const mk = `${currentYear}-${String(idx + 1).padStart(2, '0')}`; const d = yearlyData.monthly_totals[mk] || { income: 0, expense: 0, total: 0 }; return (<tr key={mk} className="border-b"><td className="p-3 font-medium">{m}</td><td className="p-3 text-right font-semibold" style={{ color: '#27ae60' }}>CHF {d.income.toFixed(2)}</td><td className="p-3 text-right font-semibold" style={{ color: '#e67e22' }}>CHF {d.expense.toFixed(2)}</td><td className="p-3 text-right font-bold" style={{ color: d.total >= 0 ? '#27ae60' : '#c0392b' }}>CHF {d.total.toFixed(2)}</td></tr>); })}</tbody></table></div></CardContent></Card>
    </main>
  );
}

export default YearlyView;