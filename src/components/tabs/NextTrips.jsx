import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Users, Plane, Baby, Luggage, PawPrint, Car } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TripModal from '@/components/TripModal';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';

const NextTrips = ({ trips, user, vehicles = [], refreshTrips }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const { toast } = useToast();

  const now = new Date();
  const nextTrips = trips.filter(
    trip => trip.driver_id === user.id && 
           trip.status === 'Confirmed' &&
           new Date(trip.pickup_time) >= now
  ).sort((a, b) => new Date(a.pickup_time) - new Date(b.pickup_time));

  const startTrip = async (tripId) => {
    const { error: updateError } = await supabase
      .from('trips')
      .update({ status: 'En Route' })
      .eq('id', tripId);

    if (updateError) {
      toast({ variant: "destructive", title: "Error starting trip", description: updateError.message });
      return;
    }

    const { error: eventError } = await supabase
      .from('trip_events')
      .insert({ trip_id: tripId, event_type: 'en_route', driver_id: user.id, timestamp: new Date().toISOString() });

    if (eventError) {
      toast({ variant: "destructive", title: "Error recording event", description: eventError.message });
      return;
    }

    toast({
      title: "Trip Started!",
      description: "The trip is now active in your Current tab.",
    });

    setSelectedTrip(null);
      refreshTrips && refreshTrips();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  const vehicleMap = useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {});
  }, [vehicles]);

  if (nextTrips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-white text-lg font-medium mb-2">No Upcoming Trips</h3>
        <p className="text-gray-400">Your confirmed future trips will appear here.</p>
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
        Next Trips ({nextTrips.length})
      </motion.h2>

      <div className="space-y-3">
        {nextTrips.map((trip, index) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedTrip(trip)}
            className="glass rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-all duration-200 border-l-4 border-l-purple-400"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border status-accepted">
                    Confirmed
                  </span>
                  {trip.airline && (
                    <div className="flex items-center space-x-1 text-blue-300">
                      <Plane className="w-3 h-3" />
                      <span className="text-xs">{trip.flight_number}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white text-sm font-medium">Pickup</p>
                      <p className="text-gray-300 text-xs">{trip.pickup_address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white text-sm font-medium">Dropoff</p>
                      <p className="text-gray-300 text-xs">{trip.dropoff_address}</p>
                    </div>
                  </div>

                  {trip.selected_vehicle_id && vehicleMap[trip.selected_vehicle_id] && (
                    <div className="flex items-center space-x-2 text-xs text-blue-200 bg-blue-600/15 border border-blue-500/30 rounded-md px-3 py-2">
                      <Car className="w-3 h-3" />
                      <span className="font-medium">
                        Vehicle: {vehicleMap[trip.selected_vehicle_id]?.name} — {vehicleMap[trip.selected_vehicle_id]?.license_plate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-white font-medium">{formatTime(trip.pickup_time)}</p>
                <p className="text-gray-400 text-xs">{formatDate(trip.pickup_time)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center space-x-4 text-gray-300">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">{trip.passenger_count}</span>
                </div>
                {trip.child_seats > 0 && (
                  <div className="flex items-center space-x-1">
                    <Baby className="w-4 h-4" />
                    <span className="text-xs">{trip.child_seats}</span>
                  </div>
                )}
                {trip.luggage_count > 0 && (
                  <div className="flex items-center space-x-1">
                    <Luggage className="w-4 h-4" />
                    <span className="text-xs">{trip.luggage_count}</span>
                  </div>
                )}
                {trip.has_pets && (
                  <PawPrint className="w-4 h-4 text-pink-400" />
                )}
              </div>
              <p className="text-green-400 font-medium text-lg">${trip.total_price}</p>
            </div>

            <div className="mt-4 flex items-center justify-between bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3">
              {trip.selected_vehicle_id && vehicleMap[trip.selected_vehicle_id] ? (
                <div className="flex items-center space-x-3">
                  <Car className="w-4 h-4 text-blue-200" />
                  <div className="text-sm text-white">
                    <p className="font-semibold">
                      {vehicleMap[trip.selected_vehicle_id]?.name}
                    </p>
                    <p className="text-xs text-blue-100">
                      {vehicleMap[trip.selected_vehicle_id]?.license_plate}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-blue-100">No vehicle assigned yet.</p>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  startTrip(trip.id);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Start Trip
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedTrip && (
          <TripModal
            trip={selectedTrip}
            user={user}
            onClose={() => setSelectedTrip(null)}
            onAcceptTrip={startTrip}
            type="next"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NextTrips;