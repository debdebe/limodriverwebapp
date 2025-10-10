import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Check, UserPlus, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TripModal from '@/components/TripModal';

const PendingTrips = ({ trips, users, drivers, refreshData }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [assignDriverTrip, setAssignDriverTrip] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const { toast } = useToast();

  const pendingTrips = useMemo(() => {
    const now = new Date();
    return trips
      .filter(trip => {
        const pickupTime = new Date(trip.pickup_time);
        const isFuture = pickupTime >= now;
        const isPending = trip.status === 'Pending';
        const isConfirmedWithoutDriver = trip.status === 'Confirmed' && !trip.driver_id;
        return isFuture && (isPending || isConfirmedWithoutDriver);
      })
      .sort((a, b) => new Date(a.pickup_time) - new Date(b.pickup_time));
  }, [trips]);

  const usersMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [users]);

  const driversMap = useMemo(() => {
    return drivers.reduce((acc, driver) => {
      acc[driver.id] = driver;
      return acc;
    }, {});
  }, [drivers]);

  const handleConfirmTrip = async (tripId) => {
    const { error } = await supabase
      .from('trips')
      .update({ status: 'Confirmed' })
      .eq('id', tripId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Trip has been confirmed. You can now assign a driver." });
      refreshData();
    }
  };

  const handleAssignDriver = async () => {
    if (!assignDriverTrip || !selectedDriverId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a driver." });
      return;
    }

    const { error } = await supabase
      .from('trips')
      .update({ driver_id: selectedDriverId })
      .eq('id', assignDriverTrip.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Driver assigned successfully." });
      setAssignDriverTrip(null);
      setSelectedDriverId('');
      refreshData();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    // Add 4 hours to compensate for timezone offset
    const adjustedDate = new Date(date.getTime() + (4 * 60 * 60 * 1000));
    return adjustedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (pendingTrips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-white text-lg font-medium mb-2">No Pending Trips</h3>
        <p className="text-gray-400">All caught up! New requests will appear here.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-white text-xl font-semibold mb-4"
      >
        Pending Trips ({pendingTrips.length})
      </motion.h2>

      <div className="space-y-3">
        {pendingTrips.map((trip, index) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-xl p-4"
          >
            <div onClick={() => setSelectedTrip(trip)} className="cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{usersMap[trip.rider_id]?.name || 'Unknown Rider'}</p>
                  <p className="text-gray-400 text-xs">{usersMap[trip.rider_id]?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatTime(trip.pickup_time)}</p>
                  <p className="text-gray-400 text-xs">{formatDate(trip.pickup_time)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">{trip.pickup_address}</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">{trip.dropoff_address}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">{trip.passenger_count} passengers</span>
                </div>
                <p className="text-green-400 font-medium">${trip.total_price}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => handleConfirmTrip(trip.id)} 
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50"
                disabled={trip.status === 'Confirmed'}
              >
                <Check className="w-4 h-4 mr-2" /> {trip.status === 'Confirmed' ? 'Confirmed' : 'Confirm'}
              </Button>
              {trip.driver_id ? (
                <Button onClick={() => setAssignDriverTrip(trip)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <User className="w-4 h-4 mr-2" /> {driversMap[trip.driver_id]?.name || 'Unknown Driver'}
                </Button>
              ) : (
                <Button onClick={() => setAssignDriverTrip(trip)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" /> Assign Driver
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedTrip && (
          <TripModal
            trip={selectedTrip}
            rider={usersMap[selectedTrip.rider_id]}
            onClose={() => setSelectedTrip(null)}
            type="boss_view"
          />
        )}
      </AnimatePresence>

      <Dialog open={!!assignDriverTrip} onOpenChange={() => setAssignDriverTrip(null)}>
        <DialogContent className="glass text-white">
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription className="text-gray-400">Select a driver for this trip.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedDriverId} value={selectedDriverId}>
              <SelectTrigger className="w-full bg-white/10 border-white/20">
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700">
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignDriverTrip(null)} className="text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleAssignDriver} className="bg-blue-600 hover:bg-blue-700">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingTrips;