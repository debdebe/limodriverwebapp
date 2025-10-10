import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Car, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const ManageVehicles = ({ vehicles, refreshData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  const openModal = (vehicle = null) => {
    setSelectedVehicle(vehicle ? { ...vehicle } : { name: '', type: 'Sedan', capacity: 4, price_per_mile: 2.5, amenities: [], image_url: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedVehicle(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const vehicleData = {
      ...selectedVehicle,
      capacity: parseInt(selectedVehicle.capacity, 10),
      price_per_mile: parseFloat(selectedVehicle.price_per_mile),
      amenities: Array.isArray(selectedVehicle.amenities) ? selectedVehicle.amenities : selectedVehicle.amenities.split(',').map(s => s.trim()),
    };

    let error;
    if (selectedVehicle.id) {
      ({ error } = await supabase.from('vehicles').update(vehicleData).eq('id', selectedVehicle.id));
    } else {
      const dataToInsert = {
        ...vehicleData,
        id_system: vehicleData.id_system || 1,
        system_date: vehicleData.system_date || new Date().toISOString(),
      };
      ({ error } = await supabase.from('vehicles').insert(dataToInsert));
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: `Vehicle ${selectedVehicle.id ? 'updated' : 'added'} successfully.` });
      closeModal();
      refreshData();
    }
  };

  const openDeleteConfirm = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('vehicles').delete().eq('id', selectedVehicle.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Vehicle deleted." });
      setIsDeleteConfirmOpen(false);
      setSelectedVehicle(null);
      refreshData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-white text-xl font-semibold"
        >
          Manage Vehicles ({vehicles.length})
        </motion.h2>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle, index) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass rounded-xl p-4 flex flex-col justify-between"
          >
            <div>
              <img alt={vehicle.name} className="w-full h-40 object-cover rounded-lg mb-4" src="https://images.unsplash.com/photo-1691244503909-40e0069e55ad" />
              <h3 className="text-white font-semibold text-lg">{vehicle.name}</h3>
              <p className="text-gray-400 text-sm">{vehicle.type} - {vehicle.capacity} seats</p>
              <p className="text-green-400 font-medium mt-2">${vehicle.price_per_mile}/mile</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => openModal(vehicle)} variant="outline" className="flex-1 text-white border-white/20 hover:bg-white/10 bg-transparent">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button onClick={() => openDeleteConfirm(vehicle)} variant="destructive" className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="glass text-white">
          <DialogHeader>
            <DialogTitle>{selectedVehicle?.id ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={selectedVehicle?.name || ''} onChange={handleInputChange} className="col-span-3 bg-white/10 border-white/20" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Input id="type" name="type" value={selectedVehicle?.type || ''} onChange={handleInputChange} className="col-span-3 bg-white/10 border-white/20" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capacity" className="text-right">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" value={selectedVehicle?.capacity || ''} onChange={handleInputChange} className="col-span-3 bg-white/10 border-white/20" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price_per_mile" className="text-right">Price/Mile</Label>
              <Input id="price_per_mile" name="price_per_mile" type="number" step="0.01" value={selectedVehicle?.price_per_mile || ''} onChange={handleInputChange} className="col-span-3 bg-white/10 border-white/20" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image_url" className="text-right">Image URL</Label>
              <Input id="image_url" name="image_url" value={selectedVehicle?.image_url || ''} onChange={handleInputChange} className="col-span-3 bg-white/10 border-white/20" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amenities" className="text-right">Amenities</Label>
              <Input id="amenities" name="amenities" placeholder="wifi,water,etc" value={Array.isArray(selectedVehicle?.amenities) ? selectedVehicle?.amenities.join(',') : ''} onChange={handleInputChange} className="col-span-3 bg-white/10 border-white/20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeModal} className="text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={() => setIsDeleteConfirmOpen(false)}>
        <DialogContent className="glass text-white">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription className="text-gray-400">This will permanently delete the vehicle "{selectedVehicle?.name}". This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="text-white hover:bg-white/10">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageVehicles;