import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { formatDate, getCurrentDateISO } from '../utils/dateUtils';

function VehicleManagement() {
  const { token } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState({});
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteServiceConfirm, setDeleteServiceConfirm] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ marke: '', modell: '', chassis_nr: '', first_inv: '', km_stand: '', sommerreifen: '', winterreifen: '', notes: '' });
  const [serviceForm, setServiceForm] = useState({ date: getCurrentDateISO(), description: '', km_stand: '' });
  const [serviceFile, setServiceFile] = useState(null);
  const [fahrzeugausweisFile, setFahrzeugausweisFile] = useState(null);
  const [vehicleImages, setVehicleImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API}/vehicles`, { headers: { Authorization: token } });
      setVehicles(response.data);
      response.data.forEach(v => fetchServices(v.id));
    } catch (error) {
      toast.error('Fehler beim Laden');
    }
  };

  const fetchServices = async (vehicleId) => {
    try {
      const response = await axios.get(`${API}/vehicles/${vehicleId}/services`, { headers: { Authorization: token } });
      setServices(prev => ({ ...prev, [vehicleId]: response.data }));
    } catch (error) {
      console.error('Fehler beim Laden der Services:', error);
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let vehicleId;
      
      if (editingVehicle) {
        await axios.put(`${API}/vehicles/${editingVehicle.id}`, vehicleForm, { headers: { Authorization: token } });
        toast.success('Fahrzeug aktualisiert');
        vehicleId = editingVehicle.id;
      } else {
        const res = await axios.post(`${API}/vehicles`, vehicleForm, { headers: { Authorization: token } });
        toast.success('Fahrzeug hinzugefuegt');
        vehicleId = res.data.id;
      }

      // Upload Fahrzeugausweis
      if (fahrzeugausweisFile && vehicleId) {
        const fd = new FormData();
        fd.append('file', fahrzeugausweisFile);
        await axios.post(`${API}/vehicles/${vehicleId}/fahrzeugausweis`, fd, { headers: { Authorization: token } });
      }

      // Upload images
      if (vehicleImages.length > 0 && vehicleId) {
        for (const img of vehicleImages) {
          const fd = new FormData();
          fd.append('file', img);
          await axios.post(`${API}/vehicles/${vehicleId}/images`, fd, { headers: { Authorization: token } });
        }
      }

      setShowVehicleDialog(false);
      setEditingVehicle(null);
      setFahrzeugausweisFile(null);
      setVehicleImages([]);
      setVehicleForm({ marke: '', modell: '', chassis_nr: '', first_inv: '', km_stand: '', sommerreifen: '', winterreifen: '', notes: '' });
      fetchVehicles();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/services`, { ...serviceForm, vehicle_id: selectedVehicle }, { headers: { Authorization: token } });
      
      if (serviceFile) {
        const fd = new FormData();
        fd.append('file', serviceFile);
        await axios.post(`${API}/services/${res.data.id}/upload`, fd, { headers: { Authorization: token } });
      }
      
      toast.success('Service hinzugefuegt');
      setShowServiceDialog(false);
      setServiceForm({ date: getCurrentDateISO(), description: '', km_stand: '' });
      setServiceFile(null);
      fetchServices(selectedVehicle);
    } catch (error) {
      console.error('Service Error:', error);
      toast.error('Fehler beim Speichern: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`${API}/vehicles/${deleteConfirm}`, { headers: { Authorization: token } });
      toast.success('Fahrzeug geloescht');
      fetchVehicles();
    } catch (error) {
      toast.error('Fehler beim Loeschen');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteService = async () => {
    if (!deleteServiceConfirm) return;
    try {
      await axios.delete(`${API}/services/${deleteServiceConfirm}`, { headers: { Authorization: token } });
      toast.success('Service geloescht');
      Object.keys(services).forEach(vid => fetchServices(vid));
    } catch (error) {
      toast.error('Fehler beim Loeschen');
    } finally {
      setDeleteServiceConfirm(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fahrzeug loeschen?</AlertDialogTitle>
            <AlertDialogDescription>Moechten Sie dieses Fahrzeug wirklich loeschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVehicle} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteServiceConfirm} onOpenChange={() => setDeleteServiceConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Service loeschen?</AlertDialogTitle>
            <AlertDialogDescription>Moechten Sie diesen Service-Eintrag wirklich loeschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} style={{ background: '#d63031', color: 'white' }}>Loeschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Fahrzeuguebersicht</h1>
        <Dialog open={showVehicleDialog} onOpenChange={(open) => {
          setShowVehicleDialog(open);
          if (!open) {
            setEditingVehicle(null);
            setFahrzeugausweisFile(null);
            setVehicleImages([]);
            setVehicleForm({ marke: '', modell: '', chassis_nr: '', first_inv: '', km_stand: '', sommerreifen: '', winterreifen: '', notes: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button style={{ background: '#d63031', color: 'white' }}><Plus className="mr-2 h-4 w-4" />Fahrzeug</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}</DialogTitle></DialogHeader>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Marke</Label><Input value={vehicleForm.marke} onChange={(e) => setVehicleForm({ ...vehicleForm, marke: e.target.value })} required /></div>
                <div><Label>Modell</Label><Input value={vehicleForm.modell} onChange={(e) => setVehicleForm({ ...vehicleForm, modell: e.target.value })} required /></div>
              </div>
              <div><Label>Chassis Nr.</Label><Input value={vehicleForm.chassis_nr} onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_nr: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>1. Inv.</Label><Input value={vehicleForm.first_inv} onChange={(e) => setVehicleForm({ ...vehicleForm, first_inv: e.target.value })} required /></div>
                <div><Label>KM Stand</Label><Input type="number" value={vehicleForm.km_stand} onChange={(e) => setVehicleForm({ ...vehicleForm, km_stand: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Sommerreifen</Label><Input value={vehicleForm.sommerreifen} onChange={(e) => setVehicleForm({ ...vehicleForm, sommerreifen: e.target.value })} placeholder="z.B. 225/45 R17" /></div>
                <div><Label>Winterreifen</Label><Input value={vehicleForm.winterreifen} onChange={(e) => setVehicleForm({ ...vehicleForm, winterreifen: e.target.value })} placeholder="z.B. 225/45 R17" /></div>
              </div>
              <div><Label>Bemerkungen</Label><Textarea value={vehicleForm.notes} onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })} rows={3} placeholder="Wichtige Infos zum Fahrzeug..." /></div>
              
              <div className="space-y-3">
                <div className="border-2 border-dashed rounded-lg p-3" style={{ borderColor: '#3498db' }}>
                  <Label className="block mb-2 font-semibold" style={{ color: '#3498db' }}>Fahrzeugausweis (PDF)</Label>
                  <Input type="file" accept=".pdf" onChange={(e) => setFahrzeugausweisFile(e.target.files[0])} />
                </div>
                
                <div className="border-2 border-dashed rounded-lg p-3" style={{ borderColor: '#27ae60' }}>
                  <Label className="block mb-2 font-semibold" style={{ color: '#27ae60' }}>Fahrzeugbilder (mehrere möglich)</Label>
                  <Input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e) => setVehicleImages(Array.from(e.target.files))} />
                  {vehicleImages.length > 0 && <p className="text-sm text-green-600 mt-1">{vehicleImages.length} Bild(er) ausgewählt</p>}
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading} style={{ background: '#d63031', color: 'white' }}>{loading ? 'Speichern...' : (editingVehicle ? 'Aktualisieren' : 'Hinzufuegen')}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {vehicles.map(v => (
          <Card key={v.id} className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">{v.marke} {v.modell}</CardTitle>
                  <div className="text-sm text-gray-600 mt-2 space-y-1">
                    <p>Chassis: {v.chassis_nr}</p>
                    <p>1. Inv.: {v.first_inv} | KM: {v.km_stand.toLocaleString()}</p>
                    {v.sommerreifen && <p>Sommerreifen: {v.sommerreifen}</p>}
                    {v.winterreifen && <p>Winterreifen: {v.winterreifen}</p>}
                    {v.notes && <p className="text-xs italic mt-1">"{v.notes.substring(0, 50)}..."</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingVehicle(v); setVehicleForm(v); setShowVehicleDialog(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(v.id)}>
                    <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold">Service-Eintraege</h3>
                <Button size="sm" onClick={() => { setSelectedVehicle(v.id); setShowServiceDialog(true); }} style={{ background: '#d63031', color: 'white' }}>
                  <Plus className="mr-2 h-3 w-3" />Service
                </Button>
              </div>
              {services[v.id] && services[v.id].length > 0 ? (
                <div className="space-y-2">
                  {services[v.id].map(s => (
                    <div key={s.id} className="flex justify-between items-start p-3 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{formatDate(s.date)} - KM: {s.km_stand.toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                        {s.file_url && (
                          <a href={`${API.replace('/api', '')}${s.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                            Beleg ansehen
                          </a>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteServiceConfirm(s.id)}>
                        <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Noch keine Service-Eintraege</p>
              )}
              
              {/* Fahrzeugausweis */}
              {v.fahrzeugausweis_url && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2">Fahrzeugausweis</p>
                  <a href={`${API.replace('/api', '')}${v.fahrzeugausweis_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    Fahrzeugausweis ansehen
                  </a>
                </div>
              )}
              
              {/* Fahrzeugbilder */}
              {v.images && v.images.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2">Fahrzeugbilder ({v.images.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {v.images.map((img, idx) => (
                      <a key={idx} href={`${API.replace('/api', '')}${img}`} target="_blank" rel="noopener noreferrer">
                        <img src={`${API.replace('/api', '')}${img}`} alt="Fahrzeug" className="w-full h-20 object-cover rounded border hover:opacity-80" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {vehicles.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center text-gray-500">Keine Fahrzeuge vorhanden</CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Service hinzufuegen</DialogTitle></DialogHeader>
          <form onSubmit={handleServiceSubmit} className="space-y-4">
            <div><Label>Datum</Label><Input type="date" value={serviceForm.date} onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })} required /></div>
            <div><Label>Beschreibung</Label><Textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} required /></div>
            <div><Label>KM Stand</Label><Input type="number" value={serviceForm.km_stand} onChange={(e) => setServiceForm({ ...serviceForm, km_stand: e.target.value })} required /></div>
            <div><Label>Beleg (optional)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setServiceFile(e.target.files[0])} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Speichern...' : 'Hinzufuegen'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default VehicleManagement;