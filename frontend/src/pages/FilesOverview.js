import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Image } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

function FilesOverview() {
  const { token } = useContext(AuthContext);
  const [allFiles, setAllFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllFiles(); }, []);

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      const transRes = await axios.get(`${API}/transactions`, { headers: { Authorization: token } });
      const files = [];
      transRes.data.forEach(t => { if (t.file_url) files.push({ date: t.date, type: 'Eintrag', description: t.description, file_url: t.file_url }); });
      files.sort((a, b) => b.date.localeCompare(a.date));
      setAllFiles(files);
    } catch (error) { toast.error('Fehler'); } finally { setLoading(false); }
  };

  if (loading) return <main className="max-w-7xl mx-auto p-8"><p className="text-center">Laden...</p></main>;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: '#d63031' }}>Alle Dateien</h1>
      <Card className="border-0 shadow-lg"><CardHeader><CardTitle>Dateiuebersicht ({allFiles.length} Dateien)</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">Datum</th><th className="p-3 text-left">Typ</th><th className="p-3 text-left">Beschreibung</th><th className="p-3 text-right">Datei</th></tr></thead><tbody>{allFiles.map((file, idx) => (<tr key={idx} className="border-b"><td className="p-3">{formatDate(file.date)}</td><td className="p-3"><span className="px-2 py-1 rounded text-xs" style={{ background: '#e8f8f5', color: '#27ae60' }}>{file.type}</span></td><td className="p-3 truncate max-w-md">{file.description}</td><td className="p-3 text-right"><a href={`${API.replace('/api', '')}${file.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">{file.file_url.endsWith('.pdf') ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}Ansehen</a></td></tr>))}{allFiles.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">Keine Dateien</td></tr>}</tbody></table></div></CardContent></Card>
    </main>
  );
}

export default FilesOverview;