import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Image } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

function FilesOverview() {
  const { token } = useContext(AuthContext);
  const [allFiles, setAllFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllFiles();
  }, []);

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      
      // Fetch all transactions with files
      const transactionsRes = await axios.get(`${API}/transactions`, {
        headers: { Authorization: token }
      });
      
      // Fetch all bank documents
      const currentYear = new Date().getFullYear();
      const bankDocs = [];
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
        try {
          const res = await axios.get(`${API}/bank-documents?month=${monthKey}`, {
            headers: { Authorization: token }
          });
          bankDocs.push(...res.data);
        } catch (e) {
          console.error('Error fetching bank docs:', e);
        }
      }
      
      // Fetch all misc items
      const miscItems = [];
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
        try {
          const res = await axios.get(`${API}/misc-items?month=${monthKey}`, {
            headers: { Authorization: token }
          });
          miscItems.push(...res.data);
        } catch (e) {
          console.error('Error fetching misc items:', e);
        }
      }
      
      // Combine all files
      const files = [];
      
      // Add transaction files
      transactionsRes.data.forEach(trans => {
        if (trans.file_url) {
          files.push({
            date: trans.date,
            type: 'Eintrag',
            description: trans.description,
            file_url: trans.file_url\n          });\n        }\n      });\n      \n      // Add bank documents\n      bankDocs.forEach(doc => {\n        if (doc.file_url) {\n          files.push({\n            date: doc.date,\n            type: 'Bankbeleg',\n            description: 'Bankbeleg',\n            file_url: doc.file_url\n          });\n        }\n      });\n      \n      // Add misc files\n      miscItems.forEach(item => {\n        if (item.file_url) {\n          files.push({\n            date: item.date,\n            type: 'Diverses',\n            description: item.remarks,\n            file_url: item.file_url\n          });\n        }\n      });\n      \n      // Sort by date descending\n      files.sort((a, b) => b.date.localeCompare(a.date));\n      \n      setAllFiles(files);\n    } catch (error) {\n      toast.error('Fehler beim Laden der Dateien');\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  if (loading) {\n    return (\n      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">\n        <p className=\"text-center\">Laden...</p>\n      </main>\n    );\n  }\n\n  return (\n    <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8\">\n      <h1 className=\"text-2xl sm:text-3xl font-bold mb-6\" style={{ color: '#d63031' }}>Alle Dateien</h1>\n      \n      <Card className=\"border-0 shadow-lg\">\n        <CardHeader>\n          <CardTitle>Dateiuebersicht ({allFiles.length} Dateien)</CardTitle>\n        </CardHeader>\n        <CardContent>\n          <div className=\"overflow-x-auto\">\n            <Table>\n              <TableHeader>\n                <TableRow style={{ background: '#f8f9fa' }}>\n                  <TableHead>Datum</TableHead>\n                  <TableHead>Typ</TableHead>\n                  <TableHead>Beschreibung</TableHead>\n                  <TableHead className=\"text-right\">Datei</TableHead>\n                </TableRow>\n              </TableHeader>\n              <TableBody>\n                {allFiles.map((file, idx) => (\n                  <TableRow key={idx}>\n                    <TableCell>{formatDate(file.date)}</TableCell>\n                    <TableCell>\n                      <span className=\"px-2 py-1 rounded text-xs\" style={{ \n                        background: file.type === 'Eintrag' ? '#e8f8f5' : file.type === 'Bankbeleg' ? '#fef5e7' : '#f0f0f0',\n                        color: file.type === 'Eintrag' ? '#27ae60' : file.type === 'Bankbeleg' ? '#e67e22' : '#666'\n                      }}>\n                        {file.type}\n                      </span>\n                    </TableCell>\n                    <TableCell className=\"max-w-md truncate\">{file.description}</TableCell>\n                    <TableCell className=\"text-right\">\n                      <a \n                        href={`${API.replace('/api', '')}${file.file_url}`} \n                        target=\"_blank\" \n                        rel=\"noopener noreferrer\" \n                        className=\"text-blue-600 hover:underline inline-flex items-center gap-1\"\n                      >\n                        {file.file_url.endsWith('.pdf') ? <FileText className=\"h-4 w-4\" /> : <Image className=\"h-4 w-4\" />}\n                        Ansehen\n                      </a>\n                    </TableCell>\n                  </TableRow>\n                ))}\n                {allFiles.length === 0 && (\n                  <TableRow>\n                    <TableCell colSpan={4} className=\"text-center py-8 text-gray-500\">\n                      Keine Dateien vorhanden\n                    </TableCell>\n                  </TableRow>\n                )}\n              </TableBody>\n            </Table>\n          </div>\n        </CardContent>\n      </Card>\n    </main>\n  );\n}\n\nexport default FilesOverview;
