import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Image, Plus, Trash2 } from 'lucide-react';
import { formatDate, getCurrentDateISO } from '../utils/dateUtils';

function FilesOverview() {
  const { token } = useContext(AuthContext);
  const [allFiles, setAllFiles] = useState([]);
  const [importantUploads, setImportantUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => { fetchAllFiles(); fetchImportantUploads(); }, []);

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      const transRes = await axios.get(`${API}/transactions`, { headers: { Authorization: token } });
      const files = [];
      
      transRes.data.forEach(t => {
        if (t.file_url) files.push({ date: t.date, type: 'Eintrag', description: t.description, file_url: t.file_url });
      });
      
      const currentYear = new Date().getFullYear();
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
        try {
          const bankRes = await axios.get(`${API}/bank-documents?month=${monthKey}`, { headers: { Authorization: token } });
          bankRes.data.forEach(d => { if (d.file_url) files.push({ date: d.date, type: 'Bankbeleg', description: 'Bankbeleg', file_url: d.file_url }); });
        } catch (e) { console.error(e); }
        
        try {
          const miscRes = await axios.get(`${API}/misc-items?month=${monthKey}`, { headers: { Authorization: token } });
          miscRes.data.forEach(item => { if (item.file_url) files.push({ date: item.date, type: 'Diverses', description: item.remarks, file_url: item.file_url }); });
        } catch (e) { console.error(e); }
      }
      
      try {
        const impRes = await axios.get(`${API}/important-uploads`, { headers: { Authorization: token } });
        impRes.data.forEach(item => { if (item.file_url) files.push({ date: item.date, type: 'Wichtig', description: item.description, file_url: item.file_url }); });
      } catch (e) { console.error(e); }
      
      files.sort((a, b) => b.date.localeCompare(a.date));
      setAllFiles(files);
    } catch (error) {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportantUploads = async () => {
    try {
      const response = await axios.get(`${API}/important-uploads`, { headers: { Authorization: token } });
      setImportantUploads(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddImportant = async () => {
    if (!file || !description.trim()) {
      toast.error('Bitte Beschreibung und Datei angeben');
      return;
    }

    try {
      const response = await axios.post(`${API}/important-uploads`, {
        date: getCurrentDateISO(),
        description
      }, { headers: { Authorization: token } });

      const formData = new FormData();
      formData.append('file', file);
      await axios.post(`${API}/important-uploads/${response.data.id}/upload`, formData, {
        headers: { Authorization: token }
      });

      toast.success('Upload hinzugefuegt');
      setDescription('');
      setFile(null);
      fetchImportantUploads();
      fetchAllFiles();
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const handleDeleteImportant = async (id) => {
    try {
      await axios.delete(`${API}/important-uploads/${id}`, { headers: { Authorization: token } });
      toast.success('Geloescht');
      fetchImportantUploads();
      fetchAllFiles();
    } catch (error) {
      toast.error('Fehler');
    }
  };

  if (loading) return <main className="max-w-7xl mx-auto p-8"><p className="text-center">Laden...</p></main>;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: '#d63031' }}>Dateiuebersicht</h1>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="all">Alle Dateien ({allFiles.length})</TabsTrigger>
          <TabsTrigger value="important">Wichtige Uploads ({importantUploads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3 text-left">Datum</th>
                      <th className="p-3 text-left">Typ</th>
                      <th className="p-3 text-left">Beschreibung</th>
                      <th className="p-3 text-right">Datei</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFiles.map((file, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3">{formatDate(file.date)}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-xs" style={{ 
                            background: file.type === 'Eintrag' ? '#e8f8f5' : file.type === 'Bankbeleg' ? '#fef5e7' : file.type === 'Wichtig' ? '#ffe8e8' : '#f0f0f0',
                            color: file.type === 'Eintrag' ? '#27ae60' : file.type === 'Bankbeleg' ? '#e67e22' : file.type === 'Wichtig' ? '#d63031' : '#666'
                          }}>{file.type}</span>
                        </td>
                        <td className="p-3 max-w-md truncate">{file.description}</td>
                        <td className="p-3 text-right">
                          <a href={`${API.replace('/api', '')}${file.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            {file.file_url.endsWith('.pdf') ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                            Ansehen
                          </a>
                        </td>
                      </tr>
                    ))}
                    {allFiles.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">Keine Dateien vorhanden</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="important">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Wichtige Datei hochladen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div>
                  <Label>Beschreibung</Label>
                  <Textarea placeholder="Was ist das fuer eine Datei?" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} className="flex-1" />
                  <Button onClick={handleAddImportant} disabled={!file || !description.trim()} style={{ background: '#d63031', color: 'white' }}>
                    <Plus className="mr-2 h-4 w-4" />Hochladen
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {importantUploads.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg bg-white shadow-sm">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">{formatDate(item.date)}</p>
                      <p className="font-medium mt-1">{item.description}</p>
                      {item.file_url && (
                        <a href={`${API.replace('/api', '')}${item.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                          {item.file_url.endsWith('.pdf') ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                          Datei ansehen
                        </a>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteImportant(item.id)}>
                      <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                    </Button>
                  </div>
                ))}
                {importantUploads.length === 0 && <p className="text-center py-8 text-gray-500">Noch keine wichtigen Uploads</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default FilesOverview;
