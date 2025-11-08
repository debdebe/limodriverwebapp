import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Check, X, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import TripModal from '@/components/TripModal';

const NextTrips = ({ trips = [], users = [], drivers = [], refreshData }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const { toast } = useToast();

  // Filter confirmed trips only
  const confirmedTrips = useMemo(() => {
    return trips.filter(trip => trip.status === 'Confirmed');
  }, [trips]);

  // Create maps for quick lookup
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

  const handleCompleteTrip = async (tripId) => {
    const { error } = await supabase
      .from('trips')
      .update({ status: 'Completed' })
      .eq('id', tripId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Trip marked as completed." });
      refreshData();
    }
  };

  const handleCancelTrip = async (tripId) => {
    const { error } = await supabase
      .from('trips')
      .update({ status: 'Cancelled' })
      .eq('id', tripId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Trip cancelled." });
      refreshData();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    // Display time in NY timezone
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
  };
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });

  if (confirmedTrips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-white text-lg font-medium mb-2">No Confirmed Trips</h3>
        <p className="text-gray-400">Confirmed trips will appear here.</p>
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
        Next Trips ({confirmedTrips.length})
      </motion.h2>

      <div className="space-y-3">
        {confirmedTrips.map((trip, index) => (
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
                  {trip.driver_id && (
                    <>
                      <User className="w-4 h-4 ml-2" />
                      <span className="text-xs">{driversMap[trip.driver_id]?.name || 'Unknown Driver'}</span>
                    </>
                  )}
                </div>
                <p className="text-green-400 font-medium">${trip.total_price}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => handleCompleteTrip(trip.id)} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" /> Complete
              </Button>
              <Button 
                onClick={() => handleCancelTrip(trip.id)} 
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
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
    </div>
  );
};

export default NextTrips;
