import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Edit, Trash2, User as UserIcon, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const getAvatarUrl = async (path) => {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage.from('limonjphoto').download(path);
    if (error) {
      console.error('Error downloading avatar: ', error.message);
      return null;
    }
    return URL.createObjectURL(data);
  } catch (error) {
    console.error('Error creating avatar URL: ', error);
    return null;
  }
};

const DriverTripsModal = ({
  driver,
  trips,
  onClose
}) => {
  const driverTrips = useMemo(() => {
    return trips.filter(trip => trip.driver_id === driver.id).sort((a, b) => new Date(b.pickup_time) - new Date(a.pickup_time));
  }, [driver, trips]);
  return <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Trip History for {driver.name}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Showing all trips assigned to this driver, newest first.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {driverTrips.length > 0 ? driverTrips.map(trip => <div key={trip.id} className="bg-white/5 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-white">{new Date(trip.pickup_time).toLocaleDateString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${trip.status === 'Completed' ? 'bg-green-500/20 text-green-400' : trip.status === 'En Route' ? 'bg-blue-500/20 text-blue-400' : trip.status === 'Confirmed' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>{trip.status}</span>
                </div>
                <p className="text-xs text-gray-300 truncate">
                  <span className="font-semibold">From:</span> {trip.pickup_address}
                </p>
                <p className="text-xs text-gray-300 truncate">
                  <span className="font-semibold">To:</span> {trip.dropoff_address}
                </p>
              </div>) : <p className="text-gray-400 text-center py-8">No trips found for this driver.</p>}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="text-white border-white/20 hover:bg-white/10">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
const ManageDrivers = ({
  drivers,
  bossId,
  refreshData,
  allTrips
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTripsModalOpen, setIsTripsModalOpen] = useState(false);
  const [viewingDriver, setViewingDriver] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [driverAvatars, setDriverAvatars] = useState({});
  const {
    toast
  } = useToast();

  // Load avatars when drivers change
  useEffect(() => {
    const loadAvatars = async () => {
      const avatarPromises = drivers.map(async (driver) => {
        if (driver.avatar_path) {
          const avatarUrl = await getAvatarUrl(driver.avatar_path);
          return { driverId: driver.id, avatarUrl };
        }
        return { driverId: driver.id, avatarUrl: null };
      });
      
      const results = await Promise.all(avatarPromises);
      const avatarMap = results.reduce((acc, { driverId, avatarUrl }) => {
        acc[driverId] = avatarUrl;
        return acc;
      }, {});
      
      setDriverAvatars(avatarMap);
    };

    loadAvatars();
  }, [drivers]);
  const openModal = async (driver = null) => {
    setSelectedDriver(driver ? {
      ...driver
    } : {
      name: '',
      email: '',
      phone: '',
      hourly_rate: 30,
      password: ''
    });
    if (driver?.avatar_path) {
      const avatarUrl = await getAvatarUrl(driver.avatar_path);
      setAvatarPreview(avatarUrl);
    } else {
      setAvatarPreview(null);
    }
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDriver(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };
  const handleFileChange = e => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  const handleSave = async () => {
    // Validation
    if (!selectedDriver.name?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name is required"
      });
      return;
    }
    if (!selectedDriver.email?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Email is required"
      });
      return;
    }
    if (!selectedDriver.phone?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Phone is required"
      });
      return;
    }
    if (!selectedDriver.hourly_rate || parseFloat(selectedDriver.hourly_rate) <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Valid hourly rate is required"
      });
      return;
    }

    // For new drivers, check if email already exists
    if (!selectedDriver.id) {
      if (!selectedDriver.password?.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Password is required"
        });
        return;
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', selectedDriver.email)
        .single();

      if (existingUser) {
        toast({
          variant: "destructive",
          title: "Email Already Exists",
          description: "A user with this email already exists"
        });
        return;
      }
    }

    let avatar_path = selectedDriver?.avatar_path || null;

    // Upload avatar if new file selected
    if (avatarFile) {
      const ts = Math.floor(Date.now() / 1000);
      const fileName = `${selectedDriver.id || 'temp'}/avatar_${ts}.jpg`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('limonjphoto').upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg'
      });
      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: uploadError.message
        });
        return;
      }
      avatar_path = uploadData.path;
    }

    let error;
    
    if (selectedDriver.id) {
      // Update existing driver
      const updatePayload = {
        name: selectedDriver.name.trim(),
        email: selectedDriver.email.trim(),
        phone: selectedDriver.phone.trim(),
        hourly_rate: parseFloat(selectedDriver.hourly_rate),
      };
      
      if (avatar_path && avatar_path !== selectedDriver.avatar_path) {
        updatePayload.avatar_path = avatar_path;
        updatePayload.avatar_uploaded_at = new Date().toISOString();
        updatePayload.avatar_version = Math.floor(Date.now() / 1000);
      }

      const { error: userError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', selectedDriver.id);
      
      error = userError;
    } else {
      // Create new driver
      const ts = Math.floor(Date.now() / 1000);
      const userData = {
        name: selectedDriver.name.trim(),
        email: selectedDriver.email.trim(),
        phone: selectedDriver.phone.trim(),
        password: selectedDriver.password.trim(),
        hourly_rate: parseFloat(selectedDriver.hourly_rate),
        role: 'Driver',
        is_verified: true,
        system_date: new Date().toISOString(),
      };
      
      if (avatar_path) {
        userData.avatar_path = avatar_path;
        userData.avatar_uploaded_at = new Date().toISOString();
        userData.avatar_version = ts;
      }

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      error = userError;
      
      if (!error && newUser) {
        // Create driver record
        const { error: driverLinkError } = await supabase
          .from('drivers')
          .insert({
            user_id: newUser.id,
            boss_user_id: bossId,
            system_date: new Date().toISOString()
          });
        error = driverLinkError;
      } else if (userError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not create user. For a full implementation, use Admin Auth."
        });
        return;
      }
    }
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } else {
      toast({
        title: "Success",
        description: `Driver ${selectedDriver.id ? 'updated' : 'added'}.`
      });
      closeModal();
      refreshData();
    }
  };
  const openDeleteConfirm = driver => {
    setSelectedDriver(driver);
    setIsDeleteConfirmOpen(true);
  };
  const handleDelete = async () => {
    const {
      error: driverLinkError
    } = await supabase.from('drivers').delete().eq('user_id', selectedDriver.id);
    if (driverLinkError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Could not remove driver link: ${driverLinkError.message}`
      });
      return;
    }
    const {
      error: userError
    } = await supabase.from('users').delete().eq('id', selectedDriver.id);
    if (userError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Could not delete user: ${userError.message}`
      });
    } else {
      toast({
        title: "Success",
        description: "Driver removed."
      });
      setIsDeleteConfirmOpen(false);
      setSelectedDriver(null);
      refreshData();
    }
  };
  const openTripsModal = driver => {
    setViewingDriver(driver);
    setIsTripsModalOpen(true);
  };
  const closeTripsModal = () => {
    setIsTripsModalOpen(false);
    setViewingDriver(null);
  };
  return <div className="space-y-4">
      <div className="flex justify-between items-center">
        <motion.h2 initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} className="text-white text-xl font-semibold">
          Manage Drivers ({drivers.length})
        </motion.h2>
        <Button onClick={() => openModal()} className="bg-purple-600 hover:bg-purple-700">
          <UserPlus className="w-4 h-4 mr-2" /> Add Driver
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver, index) => {
          const avatarUrl = driverAvatars[driver.id];
          return (
            <motion.div key={driver.id} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: index * 0.05
            }} className="glass rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    {avatarUrl ? <img alt={driver.name} className="w-16 h-16 rounded-full object-cover" src={avatarUrl} /> : <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-gray-400" />
                      </div>}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{driver.name}</h3>
                    <p className="text-gray-400 text-sm">{driver.email}</p>
                    <p className="text-gray-400 text-sm">{driver.phone}</p>
                  </div>
                </div>
                <p className="text-green-400 font-medium mt-2">Rate: ${driver.hourly_rate}/hour</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => openModal(driver)} variant="outline" className="flex-1 text-white border-white/20 hover:bg-white/10 bg-transparent">
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button onClick={() => openTripsModal(driver)} variant="outline" className="flex-1 text-white border-white/20 hover:bg-white/10 bg-transparent">
                  <Eye className="w-4 h-4 mr-2" /> Trips
                </Button>
                <Button onClick={() => openDeleteConfirm(driver)} variant="destructive" className="flex-1">
                  <Trash2 className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {isTripsModalOpen && viewingDriver && <DriverTripsModal driver={viewingDriver} trips={allTrips} onClose={closeTripsModal} />}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="glass text-white">
          <DialogHeader>
            <DialogTitle>{selectedDriver?.id ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center relative group">
                  {avatarPreview ? <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-gray-400" />}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Label>
              <Input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <p className="text-sm text-gray-400">Click to upload avatar (optional)</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white font-medium mb-2 block">Full Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={selectedDriver?.name || ''} 
                  onChange={e => setSelectedDriver(p => ({...p, name: e.target.value}))} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" 
                  placeholder="Enter driver's full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white font-medium mb-2 block">Email Address *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={selectedDriver?.email || ''} 
                  onChange={e => setSelectedDriver(p => ({...p, email: e.target.value}))} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" 
                  placeholder="driver@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white font-medium mb-2 block">Phone Number *</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={selectedDriver?.phone || ''} 
                  onChange={e => setSelectedDriver(p => ({...p, phone: e.target.value}))} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" 
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              {!selectedDriver?.id && (
                <div>
                  <Label htmlFor="password" className="text-white font-medium mb-2 block">Password *</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    value={selectedDriver?.password || ''} 
                    onChange={e => setSelectedDriver(p => ({...p, password: e.target.value}))} 
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" 
                    placeholder="Create a secure password"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="hourly_rate" className="text-white font-medium mb-2 block">Hourly Rate *</Label>
                <Input 
                  id="hourly_rate" 
                  name="hourly_rate" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={selectedDriver?.hourly_rate || ''} 
                  onChange={e => setSelectedDriver(p => ({...p, hourly_rate: e.target.value}))} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" 
                  placeholder="30.00"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">Rate per hour in USD</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeModal} className="text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={() => setIsDeleteConfirmOpen(false)}>
        <DialogContent className="glass text-white">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription className="text-gray-400">This will permanently remove the driver "{selectedDriver?.name}". This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="text-white hover:bg-white/10">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default ManageDrivers;