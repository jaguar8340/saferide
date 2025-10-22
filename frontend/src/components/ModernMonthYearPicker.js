import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export function ModernMonthYearPicker({ currentDate, onDateChange }) {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const months = [
    { value: 1, label: 'Januar' },
    { value: 2, label: 'Februar' },
    { value: 3, label: 'März' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Dezember' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const handleMonthChange = (month) => {
    onDateChange(new Date(currentYear, parseInt(month) - 1, 1));
  };

  const handleYearChange = (year) => {
    onDateChange(new Date(parseInt(year), currentMonth - 1, 1));
  };

  return (
    <div className="mb-6">
      <Card className="border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,240,240,0.95) 100%)' }}>
        <div className="p-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: '#d63031' }} />
              <span className="text-sm font-medium text-gray-600">Zeitraum wählen:</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[160px] border-2" style={{ borderColor: '#ffcccc' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[120px] border-2" style={{ borderColor: '#ffcccc' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
