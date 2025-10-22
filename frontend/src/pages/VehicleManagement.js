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
import { Plus, Trash2, Edit2, Upload } from 'lucide-react';
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
  const [vehicleForm, setVehicleForm] = useState({
    marke: '',
    modell: '',
    chassis_nr: '',
    first_inv: '',
    km_stand: ''
  });
  const [serviceForm, setServiceForm] = useState({
    date: getCurrentDateISO(),
    description: '',
    km_stand: ''
  });
  const [serviceFile, setServiceFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API}/vehicles`, {
        headers: { Authorization: token }
      });
      setVehicles(response.data);
      
      response.data.forEach(vehicle => {
        fetchServices(vehicle.id);
      });
    } catch (error) {
      toast.error('Fehler beim Laden der Fahrzeuge');
    }
  };

  const fetchServices = async (vehicleId) => {
    try {
      const response = await axios.get(`${API}/vehicles/${vehicleId}/services`, {
        headers: { Authorization: token }
      });
      setServices(prev => ({ ...prev, [vehicleId]: response.data }));
    } catch (error) {
      console.error('Fehler beim Laden der Services:', error);
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingVehicle) {
        await axios.put(`${API}/vehicles/${editingVehicle.id}`, vehicleForm, {
          headers: { Authorization: token }
        });
        toast.success('Fahrzeug aktualisiert');
      } else {
        await axios.post(`${API}/vehicles`, vehicleForm, {
          headers: { Authorization: token }
        });
        toast.success('Fahrzeug hinzugefuegt');
      }
      
      setShowVehicleDialog(false);
      setEditingVehicle(null);
      setVehicleForm({ marke: '', modell: '', chassis_nr: '', first_inv: '', km_stand: '' });
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
      const response = await axios.post(`${API}/services`, {
        ...serviceForm,
        vehicle_id: selectedVehicle
      }, {
        headers: { Authorization: token }
      });

      if (serviceFile) {
        const formData = new FormData();
        formData.append('file', serviceFile);
        await axios.post(`${API}/services/${response.data.id}/upload`, formData, {
          headers: { Authorization: token }
        });
      }
      
      toast.success('Service hinzugefuegt');
      setShowServiceDialog(false);
      setServiceForm({ date: getCurrentDateISO(), description: '', km_stand: '' });
      setServiceFile(null);
      fetchServices(selectedVehicle);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deleteConfirm) return;

    try {
      await axios.delete(`${API}/vehicles/${deleteConfirm}`, {
        headers: { Authorization: token }
      });
      toast.success('Fahrzeug geloescht');
      fetchVehicles();
    } catch (error) {
      toast.error('Fehler beim Loeschen');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <> style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff 100%)' }}>
      

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fahrzeug loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Moechten Sie dieses Fahrzeug wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVehicle} style={{ background: '#d63031', color: 'white' }}>
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#d63031' }}>Fahrzeuguebersicht</h2>
          <Dialog open={showVehicleDialog} onOpenChange={(open) => {
            setShowVehicleDialog(open);
            if (!open) {
              setEditingVehicle(null);
              setVehicleForm({ marke: '', modell: '', chassis_nr: '', first_inv: '', km_stand: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button style={{ background: '#d63031', color: 'white' }}>
                <Plus className="mr-2 h-4 w-4" />
                Fahrzeug
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleVehicleSubmit} className="space-y-4">
                <div>
                  <Label>Marke</Label>
                  <Input value={vehicleForm.marke} onChange={(e) => setVehicleForm({ ...vehicleForm, marke: e.target.value })} required />
                </>
                <div>
                  <Label>Modell</Label>
                  <Input value={vehicleForm.modell} onChange={(e) => setVehicleForm({ ...vehicleForm, modell: e.target.value })} required />
                </>
                <div>
                  <Label>Chassis Nr.</Label>
                  <Input value={vehicleForm.chassis_nr} onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_nr: e.target.value })} required />
                </>
                <div>
                  <Label>1. Inv.</Label>
                  <Input value={vehicleForm.first_inv} onChange={(e) => setVehicleForm({ ...vehicleForm, first_inv: e.target.value })} required />
                </>
                <div>
                  <Label>KM Stand</Label>
                  <Input type="number" value={vehicleForm.km_stand} onChange={(e) => setVehicleForm({ ...vehicleForm, km_stand: e.target.value })} required />
                </>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Speichern...' : (editingVehicle ? 'Aktualisieren' : 'Hinzufuegen')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </>

        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">{vehicle.marke} {vehicle.modell}</CardTitle>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p>Chassis: {vehicle.chassis_nr}</p>
                      <p>1. Inv.: {vehicle.first_inv}</p>
                      <p>KM Stand: {vehicle.km_stand.toLocaleString()}</p>
                    </>
                  </>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingVehicle(vehicle);
                      setVehicleForm(vehicle);
                      setShowVehicleDialog(true);
                    }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(vehicle.id)}>
                      <Trash2 className="h-4 w-4" style={{ color: '#d63031' }} />
                    </Button>
                  </>
                </>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Service-Eintraege</h3>
                  <Button size="sm" onClick={() => {
                    setSelectedVehicle(vehicle.id);
                    setShowServiceDialog(true);
                  }} style={{ background: '#d63031', color: 'white' }}>
                    <Plus className="mr-2 h-3 w-3" />
                    Service
                  </Button>
                </>

                {services[vehicle.id] && services[vehicle.id].length > 0 ? (
                  <div className="space-y-2">
                    {services[vehicle.id].map((service) => (
                      <div key={service.id} className="flex justify-between items-start p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{formatDate(service.date)} - KM: {service.km_stand.toLocaleString()}</p>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          {service.file_url && (
                            <a href={`${API.replace('/api', '')}${service.file_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                              Beleg ansehen
                            </a>
                          )}
                        </>
                      </>
                    ))}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">Noch keine Service-Eintraege</p>
                )}
              </CardContent>
            </Card>
          ))}

          {vehicles.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-12 text-center text-gray-500">
                Keine Fahrzeuge vorhanden
              </CardContent>
            </Card>
          )}
        </>
      </main>

      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Service-Eintrag hinzufuegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleServiceSubmit} className="space-y-4">
            <div>
              <Label>Datum</Label>
              <Input type="date" value={serviceForm.date} onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })} required />
            </>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} required />
            </>
            <div>
              <Label>KM Stand</Label>
              <Input type="number" value={serviceForm.km_stand} onChange={(e) => setServiceForm({ ...serviceForm, km_stand: e.target.value })} required />
            </>
            <div>
              <Label>Beleg (optional)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setServiceFile(e.target.files[0])} />
            </>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Speichern...' : 'Hinzufuegen'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VehicleManagement;