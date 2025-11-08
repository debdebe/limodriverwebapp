
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, BarChart, Users, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfWeek, startOfMonth, startOfYear, endOfDay, subDays } from 'date-fns';
import TripModal from '@/components/TripModal';

const EarningsDashboard = ({ trips, tripEvents, users }) => {
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const usersMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [users]);
  
  const drivers = useMemo(() => users.filter(u => u.role === 'Driver'), [users]);
  
  const driversMap = useMemo(() => {
    return drivers.reduce((acc, driver) => {
      acc[driver.id] = driver;
      return acc;
    }, {});
  }, [drivers]);

  const completedTrips = useMemo(() => {
    return trips.filter(trip => trip.status === 'Completed' && trip.driver_id);
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return completedTrips.filter(trip => {
      const tripDate = new Date(trip.pickup_time);
      const isAfterFrom = !dateRange.from || tripDate >= dateRange.from;
      const isBeforeTo = !dateRange.to || tripDate <= endOfDay(dateRange.to);
      const isDriverMatch = selectedDriver === 'all' || trip.driver_id === selectedDriver;
      return isAfterFrom && isBeforeTo && isDriverMatch;
    });
  }, [completedTrips, dateRange, selectedDriver]);

  const calculateTripDurationInHours = (tripId) => {
    const pickedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'passenger_picked');
    const completedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'completed');
    if (pickedEvent && completedEvent) {
      const durationMs = new Date(completedEvent.timestamp) - new Date(pickedEvent.timestamp);
      return durationMs / (1000 * 60 * 60);
    }
    return 0;
  };

  const calculateDriverPayout = (trip) => {
    const durationInHours = calculateTripDurationInHours(trip.id);
    const driver = usersMap[trip.driver_id];
    const hourlyRate = driver?.hourly_rate || 0;
    return durationInHours * hourlyRate;
  };

  const stats = useMemo(() => {
    let gross = 0;
    let totalPayout = 0;
    filteredTrips.forEach(trip => {
      const price = parseFloat(trip.total_price) || 0;
      const payout = calculateDriverPayout(trip);
      gross += price;
      totalPayout += payout;
    });
    const net = gross - totalPayout;
    return {
      gross: gross.toFixed(2),
      net: net.toFixed(2),
      payout: totalPayout.toFixed(2),
      tripCount: filteredTrips.length,
    };
  }, [filteredTrips, tripEvents, usersMap]);
  
  const setDatePreset = (preset) => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'week':
        setDateRange({ from: startOfWeek(now), to: now });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: now });
        break;
      case 'year':
        setDateRange({ from: startOfYear(now), to: now });
        break;
      default:
        setDateRange({ from: undefined, to: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selectedTrip && (
          <TripModal
            trip={selectedTrip}
            rider={usersMap[selectedTrip.rider_id]}
            user={usersMap[selectedTrip.driver_id]}
            tripEvents={tripEvents}
            onClose={() => setSelectedTrip(null)}
            type="past"
          />
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-white text-2xl font-bold"
        >
          Earnings Dashboard
        </motion.h2>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="text-white border-white/20 hover:bg-white/10 bg-transparent">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Driver</label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="bg-white/10 border-white/20">
                    <SelectValue placeholder="Select Driver" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-white border-white/20 hover:bg-white/10 bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass text-white" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDatePreset('today')}>Today</Button>
              <Button size="sm" variant="secondary" onClick={() => setDatePreset('week')}>This Week</Button>
              <Button size="sm" variant="secondary" onClick={() => setDatePreset('month')}>This Month</Button>
              <Button size="sm" variant="secondary" onClick={() => setDatePreset('year')}>This Year</Button>
              <Button size="sm" variant="ghost" onClick={() => { setDateRange({ from: undefined, to: undefined }); setSelectedDriver('all'); }}>Clear</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Gross Revenue</p>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-white text-3xl font-bold">${stats.gross}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Driver Payouts</p>
            <Users className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-white text-3xl font-bold">${stats.payout}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-300 text-sm">Net Profit</p>
            <BarChart className="w-5 h-5 text-blue-300" />
          </div>
          <p className="text-white text-3xl font-bold">${stats.net}</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h3 className="text-white text-xl font-semibold mb-4">Completed Trips ({filteredTrips.length})</h3>
        <div className="glass rounded-xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {filteredTrips.length > 0 ? filteredTrips.sort((a,b) => new Date(b.pickup_time) - new Date(a.pickup_time)).map(trip => {
              const gross = parseFloat(trip.total_price).toFixed(2);
              const payout = calculateDriverPayout(trip).toFixed(2);
              const net = (gross - payout).toFixed(2);
              return (
                <div key={trip.id} className="grid grid-cols-5 gap-4 p-4 border-b border-white/10 items-center hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setSelectedTrip(trip)}>
                  <div>
                    <p className="text-white font-medium">{usersMap[trip.rider_id]?.name || 'N/A'}</p>
                    <p className="text-gray-400 text-xs">{new Date(trip.pickup_time).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{driversMap[trip.driver_id]?.name || 'N/A'}</p>
                    <p className="text-gray-400 text-xs">Driver</p>
                  </div>
                  <p className="text-green-400 text-center font-medium">${gross}</p>
                  <p className="text-red-400 text-center font-medium">-${payout}</p>
                  <p className="text-blue-300 text-right font-bold text-lg">${net}</p>
                </div>
              );
            }) : (
              <div className="text-center p-8">
                <p className="text-gray-400">No completed trips match your filters.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EarningsDashboard;
