import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

function YearlyView() {
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
      toast.error('Fehler beim Laden der Jahresdaten');
    }
  };

  if (!yearlyData) return <div>Laden...</div>;

  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const yearTotalIncome = Object.values(yearlyData.monthly_totals).reduce((sum, m) => sum + m.income, 0);
  const yearTotalExpense = Object.values(yearlyData.monthly_totals).reduce((sum, m) => sum + m.expense, 0);
  const yearTotalBalance = yearTotalIncome - yearTotalExpense;

  return (
    <> style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8\">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6\" style={{ color: '#d63031' }}>Jahres\u00fcbersicht {currentYear}</h1>
        {/* Year selector */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={currentYear.toString()} onValueChange={(value) => setCurrentYear(parseInt(value))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>

        {/* Year totals */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Jahres-Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ background: '#e8f8f5' }}>
                <p className="text-sm text-gray-600">Total Einnahmen</p>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: '#27ae60' }} data-testid="year-total-income">
                  CHF {yearTotalIncome.toFixed(2)}
                </p>
              </>
              <div className="p-4 rounded-lg" style={{ background: '#fef5e7' }}>
                <p className="text-sm text-gray-600">Total Ausgaben</p>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: '#e67e22' }} data-testid="year-total-expense">
                  CHF {yearTotalExpense.toFixed(2)}
                </p>
              </>
              <div className="p-4 rounded-lg" style={{ background: yearTotalBalance >= 0 ? '#e8f8f5' : '#fadbd8' }}>
                <p className="text-sm text-gray-600">Total Einkommen</p>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: yearTotalBalance >= 0 ? '#27ae60' : '#c0392b' }} data-testid="year-total-balance">
                  CHF {yearTotalBalance.toFixed(2)}
                </p>
              </>
            </>
          </CardContent>
        </Card>

        {/* Monthly breakdown */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Monatliche Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#f8f9fa' }}>
                    <TableHead>Monat</TableHead>
                    <TableHead className="text-right">Einnahmen</TableHead>
                    <TableHead className="text-right">Ausgaben</TableHead>
                    <TableHead className="text-right">Einkommen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months.map((monthName, idx) => {
                    const monthKey = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                    const data = yearlyData.monthly_totals[monthKey] || { income: 0, expense: 0, total: 0 };
                    
                    return (
                      <TableRow key={monthKey} data-testid="month-row">
                        <TableCell className="font-medium">{monthName}</TableCell>
                        <TableCell className="text-right" style={{ color: '#27ae60', fontWeight: '600' }}>
                          CHF {data.income.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right" style={{ color: '#e67e22', fontWeight: '600' }}>
                          CHF {data.expense.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold" style={{ color: data.total >= 0 ? '#27ae60' : '#c0392b' }}>
                          CHF {data.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

export default YearlyView;