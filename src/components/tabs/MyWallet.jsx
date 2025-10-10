import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import TripModal from '@/components/TripModal';

const MyWallet = ({ trips, tripEvents, user }) => {
  const [timeframe, setTimeframe] = useState('week');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const completedTrips = useMemo(() => {
    return trips.filter(
      trip => trip.driver_id === user.id && trip.status === 'Completed'
    );
  }, [trips, user.id]);

  const calculateTripDurationInHours = (tripId) => {
    const pickedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'passenger_picked');
    const completedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'completed');
    
    if (pickedEvent && completedEvent) {
      const durationMs = new Date(completedEvent.timestamp) - new Date(pickedEvent.timestamp);
      return durationMs / (1000 * 60 * 60);
    }
    return 0;
  };

  const calculateEarnings = (trip) => {
    const durationInHours = calculateTripDurationInHours(trip.id);
    const hourlyRate = user?.hourly_rate || 0;
    return durationInHours * hourlyRate;
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return completedTrips.filter(trip => new Date(trip.pickup_time) >= startDate);
  }, [completedTrips, timeframe]);

  const totalEarnings = useMemo(() => {
    return filteredData.reduce((sum, trip) => sum + calculateEarnings(trip), 0);
  }, [filteredData]);

  const totalTrips = filteredData.length;
  const totalHours = useMemo(() => {
    return filteredData.reduce((sum, trip) => sum + calculateTripDurationInHours(trip.id), 0);
  }, [filteredData]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const timeframes = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-2xl font-bold">My Wallet</h2>
          <div className="p-1 bg-gray-800 rounded-lg flex items-center space-x-1">
            {timeframes.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeframe === tf.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Total Earnings ({timeframe})</p>
          <p className="text-white text-4xl font-bold mb-4">${totalEarnings.toFixed(2)}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400">Trips</p>
                <p className="text-white font-medium">{totalTrips}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400">Hours</p>
                <p className="text-white font-medium">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-white text-xl font-semibold mb-4">Recent Transactions</h3>
        {filteredData.length > 0 ? (
          <div className="space-y-3">
            {filteredData.slice(0, 5).map(trip => {
              const earnings = calculateEarnings(trip);
              return (
                <div key={trip.id} className="glass rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedTrip(trip)}>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Trip Completed</p>
                      <p className="text-gray-400 text-sm">
                        {formatDate(trip.pickup_time)} at {formatTime(trip.pickup_time)}
                      </p>
                    </div>
                  </div>
                  <p className="text-green-400 font-medium text-lg">+${earnings.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 glass rounded-lg">
            <p className="text-gray-400">No transactions in this period.</p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedTrip && (
          <TripModal
            trip={selectedTrip}
            rider={null} // We don't have rider info in this context
            onClose={() => setSelectedTrip(null)}
            type="driver_view"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyWallet;