import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Users, Plane, Baby, Luggage, PawPrint } from 'lucide-react';
import TripModal from '@/components/TripModal';

const PastTrips = ({ trips, tripEvents, user }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);

  const pastTrips = trips.filter(
    trip => trip.driver_id === user.id && ['Completed', 'Cancelled'].includes(trip.status)
  ).sort((a, b) => new Date(b.pickup_time) - new Date(a.pickup_time));

  const calculateTripDurationInHours = (tripId) => {
    const pickedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'passenger_picked');
    const completedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'completed');
    
    if (pickedEvent && completedEvent) {
      const durationMs = new Date(completedEvent.timestamp) - new Date(pickedEvent.timestamp);
      return durationMs / (1000 * 60 * 60);
    }
    return 0;
  };

  const formatDuration = (durationInHours) => {
    if (durationInHours <= 0) return 'N/A';
    const hours = Math.floor(durationInHours);
    const minutes = Math.round((durationInHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const calculateEarnings = (tripId) => {
    const durationInHours = calculateTripDurationInHours(tripId);
    const hourlyRate = user?.hourly_rate || 0;
    return (durationInHours * hourlyRate).toFixed(2);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  if (pastTrips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-white text-lg font-medium mb-2">No Completed Trips</h3>
        <p className="text-gray-400">Your completed trips will appear here</p>
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
        Past Trips ({pastTrips.length})
      </motion.h2>

      <div className="space-y-3">
        {pastTrips.map((trip, index) => {
          const durationInHours = calculateTripDurationInHours(trip.id);
          const earnings = calculateEarnings(trip.id);

          return (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedTrip(trip)}
              className={`glass rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-all duration-200 border-l-4 ${
                trip.status === 'Completed' ? 'border-l-green-400' : 'border-l-red-500'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(trip.status)}`}>
                      {trip.status}
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
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">{formatDuration(durationInHours)}</span>
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
                
                <div className="text-right">
                  <p className={`${trip.status === 'Completed' ? 'text-green-400' : 'text-red-400'} font-medium`}>
                    ${trip.total_price}
                  </p>
                  {trip.status === 'Completed' && (
                    <p className="text-gray-400 text-xs">Earned: ${earnings}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedTrip && (
          <TripModal
            trip={selectedTrip}
            tripEvents={tripEvents}
            user={user}
            onClose={() => setSelectedTrip(null)}
            type="past"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PastTrips;