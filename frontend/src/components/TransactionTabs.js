import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Upload, Edit2, FileText } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

export function TransactionTabs({ 
  transactions, 
  bankDocuments, 
  miscItems,
  handleEdit, 
  setDeleteConfirm, 
  handleFileUpload, 
  uploadingFile,
  handleAddBankDocument,
  handleDeleteBankDocument,
  handleAddMiscItem,
  handleDeleteMiscItem,
  API 
}) {
  const [selectedBankFile, setSelectedBankFile] = useState(null);
  const [miscRemarks, setMiscRemarks] = useState('');
  const [miscFile, setMiscFile] = useState(null);

  const handleBankUpload = () => {
    if (selectedBankFile) {
      handleAddBankDocument(selectedBankFile);
      setSelectedBankFile(null);
    }
  };

  const handleMiscAdd = () => {
    if (miscRemarks.trim()) {
      handleAddMiscItem(miscRemarks, miscFile);
      setMiscRemarks('');
      setMiscFile(null);
    }
  };

  return (
    <Tabs defaultValue="transactions" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="transactions">Einträge</TabsTrigger>
        <TabsTrigger value="bank">Bankbelege</TabsTrigger>
        <TabsTrigger value="misc">Diverses</TabsTrigger>
      </TabsList>

      <TabsContent value="transactions">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#f8f9fa' }}>
                    <TableHead>Datum</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Konto</TableHead>
                    <TableHead>Bezahlung</TableHead>
                    <TableHead className="text-right">Einnahmen</TableHead>
                    <TableHead className="text-right">Ausgaben</TableHead>
                    <TableHead>Bemerkungen</TableHead>
                    <TableHead>Datei</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs" style={{ 
                          background: transaction.type === 'income' ? '#e8f8f5' : '#fef5e7',
                          color: transaction.type === 'income' ? '#27ae60' : '#e67e22'
                        }}>
                          {transaction.account_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{transaction.payment_method || '-'}</TableCell>
                      <TableCell className="text-right" style={{ color: '#27ae60', fontWeight: '600' }}>
                        {transaction.type === 'income' ? `CHF ${transaction.amount.toFixed(2)}` : ''}
                      </TableCell>
                      <TableCell className="text-right" style={{ color: '#e67e22', fontWeight: '600' }}>
                        {transaction.type === 'expense' ? `CHF ${transaction.amount.toFixed(2)}` : ''}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{transaction.remarks || '-'}</TableCell>
                      <TableCell>
                        {transaction.file_url ? (
                          <a href={`${API.replace('/api', '')}${transaction.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            Ansehen
                          </a>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => e.target.files[0] && handleFileUpload(transaction.id, e.target.files[0])}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={uploadingFile === transaction.id}
                            />
                            <Button variant="ghost" size="sm" asChild disabled={uploadingFile === transaction.id}>
                              <span>
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </label>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(transaction)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(transaction.id)}>
                            <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Keine Einträge für diesen Monat
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bank">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Bankbelege</CardTitle>
              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedBankFile(e.target.files[0])}
                  className="max-w-xs"
                />
                <Button onClick={handleBankUpload} disabled={!selectedBankFile} style={{ background: '#d63031', color: 'white' }}>
                  <Upload className="mr-2 h-4 w-4" />
                  Hochladen
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bankDocuments.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{formatDate(doc.date)}</p>
                      {doc.file_url && (
                        <a href={`${API.replace('/api', '')}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Datei ansehen
                        </a>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteBankDocument(doc.id)}>
                    <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                  </Button>
                </div>
              ))}
              {bankDocuments.length === 0 && (
                <p className="text-center py-8 text-gray-500">Keine Bankbelege für diesen Monat</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="misc">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Diverses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Bemerkungen eingeben..."
                  value={miscRemarks}
                  onChange={(e) => setMiscRemarks(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setMiscFile(e.target.files[0])}
                  className="flex-1"
                />
                <Button onClick={handleMiscAdd} disabled={!miscRemarks.trim()} style={{ background: '#d63031', color: 'white' }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {miscItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{formatDate(item.date)}</p>
                    <p className="font-medium mt-1">{item.remarks}</p>
                    {item.file_url && (
                      <a href={`${API.replace('/api', '')}${item.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                        Datei ansehen
                      </a>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteMiscItem(item.id)}>
                    <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                  </Button>
                </div>
              ))}
              {miscItems.length === 0 && (
                <p className="text-center py-8 text-gray-500">Keine Diverses-Einträge für diesen Monat</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
