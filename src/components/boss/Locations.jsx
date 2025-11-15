import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ExternalLink, Loader2, User as UserIcon, Clock, Route, Plane, Users, Car } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const AddressFetcher = ({ lat, lon }) => {
  const [address, setAddress] = useState('Loading address...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddress = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }
        const data = await response.json();
        const parts = [
          data.locality,
          data.city,
          data.principalSubdivision,
          data.countryCode ? data.countryCode.toUpperCase() : null,
        ].filter(Boolean);
        setAddress(parts.length ? parts.join(', ') : 'Address unavailable');
      } catch (error) {
        setAddress(`Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="flex items-center text-xs text-gray-400">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        <span>Fetching address...</span>
      </div>
    );
  }

  return <p className="text-xs text-gray-400">{address}</p>;
};


const Locations = ({ locations = [], drivers = [], trips = [], tripEvents = [], users = [], vehicles = [], refreshData }) => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverAvatars, setDriverAvatars] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
      setLastUpdated(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    let isMounted = true;
    const objectUrls = [];

    const loadAvatars = async () => {
      const entries = await Promise.all(
        drivers.map(async (driver) => {
          if (!driver.avatar_path) return [driver.id, null];
          try {
            const { data, error } = await supabase.storage.from('limonjphoto').download(driver.avatar_path);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            objectUrls.push(url);
            return [driver.id, url];
          } catch (error) {
            console.error('Error downloading driver avatar:', error);
            return [driver.id, null];
          }
        })
      );

      if (isMounted) {
        const map = entries.reduce((acc, [id, url]) => {
          acc[id] = url;
          return acc;
        }, {});
        setDriverAvatars(map);
      }
    };

    loadAvatars();

    return () => {
      isMounted = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [drivers]);

  const locationByDriver = useMemo(() => {
    const map = {};
    locations.forEach(loc => {
      if (!loc.driver_id) return;
      map[loc.driver_id] = loc;
    });
    return map;
  }, [locations]);

  const activeTripByDriver = useMemo(() => {
    const map = {};
    trips.forEach(trip => {
      if (trip.driver_id && trip.status === 'En Route') {
        map[trip.driver_id] = trip;
      }
    });
    return map;
  }, [trips]);

  const eventsByTrip = useMemo(() => {
    const map = {};
    tripEvents.forEach(event => {
      if (!map[event.trip_id]) map[event.trip_id] = [];
      map[event.trip_id].push(event);
    });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    return map;
  }, [tripEvents]);

  const vehicleMap = useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {});
  }, [vehicles]);

  const riderMap = useMemo(() => {
    return users.reduce((acc, rider) => {
      acc[rider.id] = rider;
      return acc;
    }, {});
  }, [users]);

const driverCards = useMemo(() => {
    return drivers
      .map(driver => {
        const location = locationByDriver[driver.id] || null;
        const activeTrip = activeTripByDriver[driver.id] || null;
        const lastSeen = location?.updated_at ? new Date(location.updated_at) : null;
        return {
          driver,
          location,
          activeTrip,
          events: activeTrip ? (eventsByTrip[activeTrip.id] || []) : [],
          lastSeen,
          rider: activeTrip ? riderMap[activeTrip.rider_id] : null,
          vehicle: activeTrip ? vehicleMap[activeTrip.selected_vehicle_id] : null,
        };
      })
      .sort((a, b) => {
        const aActive = a.activeTrip ? 1 : 0;
        const bActive = b.activeTrip ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aTime = a.lastSeen ? a.lastSeen.getTime() : 0;
        const bTime = b.lastSeen ? b.lastSeen.getTime() : 0;
        return bTime - aTime;
      });
  }, [drivers, locationByDriver, activeTripByDriver, eventsByTrip]);

  const formatDateTime = (value) => {
    if (!value) return 'Unknown';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  };

  const TripSummary = ({ trip }) => {
    if (!trip) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <Route className="w-4 h-4 text-blue-300" />
          <span>Trip ID: {trip.id}</span>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-400">Pickup</p>
            <p className="text-white text-sm">{trip.pickup_address}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Dropoff</p>
            <p className="text-white text-sm">{trip.dropoff_address}</p>
          </div>
        </div>
      </div>
    );
  };

  const TripEventsList = ({ events }) => {
    if (!events?.length) {
      return <p className="text-gray-400 text-sm">No trip events recorded yet.</p>;
    }
    return (
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {events.map(event => (
          <div key={event.id} className="border border-white/10 rounded-lg p-2">
            <p className="text-white text-sm font-medium capitalize">{event.event_type.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-400 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatDateTime(event.timestamp)}</span>
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderLocationCard = (card, index) => {
    const { driver, location, activeTrip } = card;
    const avatarUrl = driverAvatars[driver?.id] || null;
    const locationLink = location ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}` : null;

    return (
      <motion.div
        key={driver.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setSelectedDriver(card)}
        className={`p-4 rounded-lg flex items-start space-x-4 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
          activeTrip ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/40' : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
        }`}
      >
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img alt={driver.name} className="w-12 h-12 rounded-full object-cover" src={avatarUrl} />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-grow space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">{driver.name || 'Unknown Driver'}</p>
            {activeTrip && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                En Route
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatDateTime(card.lastSeen)}</span>
          </div>
          {location ? (
            <>
              <AddressFetcher lat={location.latitude} lon={location.longitude} />
              <div className="flex items-center space-x-2 text-xs text-blue-300">
                <ExternalLink className="w-3 h-3" />
                <span>Tap for details</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">No location data available.</p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Driver Locations</h2>
        <div className="text-right">
          <p className="text-sm text-gray-300">Last Updated:</p>
          <p className="text-xs text-gray-400">{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4 space-y-4">
        <div className="space-y-3">
          {driverCards.map(renderLocationCard)}
        </div>
        {driverCards.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-500" />
            <p className="mt-2 text-gray-400">No active drivers found.</p>
            <p className="text-sm text-gray-500">Locations will appear here when drivers are online.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDriver && (
          <Dialog open onOpenChange={() => setSelectedDriver(null)}>
            <DialogContent className="glass text-white w-[90vw] max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedDriver.driver.name || 'Driver Details'}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {selectedDriver.activeTrip ? 'Currently en route' : 'Currently off trip'}
                </DialogDescription>
              </DialogHeader>

              {selectedDriver.activeTrip ? (
                <div className="space-y-4">
                  {selectedDriver.rider && (
                    <div className="rounded-lg border border-white/10 p-3">
                      <h4 className="text-white font-semibold flex items-center space-x-2 mb-2">
                        <Users className="w-4 h-4 text-blue-300" />
                        <span>Rider</span>
                      </h4>
                      <p className="text-sm text-white">{selectedDriver.rider.name}</p>
                      {selectedDriver.rider.phone && (
                        <p className="text-xs text-gray-400">{selectedDriver.rider.phone}</p>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border border-white/10 p-3 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400">Pickup</p>
                      <p className="text-white text-sm">{selectedDriver.activeTrip.pickup_address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Dropoff</p>
                      <p className="text-white text-sm">{selectedDriver.activeTrip.dropoff_address}</p>
                    </div>
                  </div>

                  {selectedDriver.vehicle && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                      <h4 className="text-white font-semibold flex items-center space-x-2 mb-2">
                        <Car className="w-4 h-4 text-blue-200" />
                        <span>Assigned Vehicle</span>
                      </h4>
                      <p className="text-sm text-white">{selectedDriver.vehicle.name}</p>
                      <p className="text-xs text-blue-100">{selectedDriver.vehicle.license_plate}</p>
                    </div>
                  )}

                  <div className="rounded-lg border border-white/10 p-3 space-y-3">
                    <h4 className="text-white font-semibold flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-purple-300" />
                      <span>Trip Events</span>
                    </h4>
                    <TripEventsList events={selectedDriver.events} />
                  </div>

                  <div className="rounded-lg border border-white/10 p-3 space-y-2">
                    <h4 className="text-white font-semibold flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-green-300" />
                      <span>Current Location</span>
                    </h4>
                    {selectedDriver.location ? (
                      <>
                        <AddressFetcher lat={selectedDriver.location.latitude} lon={selectedDriver.location.longitude} />
                        <p className="text-xs text-gray-400">Updated: {formatDateTime(selectedDriver.location.updated_at)}</p>
                        <Button
                          asChild
                          variant="secondary"
                          className="w-full bg-white/10 hover:bg-white/20 text-white"
                        >
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedDriver.location.latitude},${selectedDriver.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open in Google Maps
                          </a>
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No location data available.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 p-3 space-y-2">
                    <h4 className="text-white font-semibold flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-green-300" />
                      <span>Last Known Location</span>
                    </h4>
                    {selectedDriver.location ? (
                      <>
                        <AddressFetcher lat={selectedDriver.location.latitude} lon={selectedDriver.location.longitude} />
                        <p className="text-xs text-gray-400">Updated: {formatDateTime(selectedDriver.location.updated_at)}</p>
                        <Button
                          asChild
                          variant="secondary"
                          className="w-full bg-white/10 hover:bg-white/20 text-white"
                        >
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedDriver.location.latitude},${selectedDriver.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open in Google Maps
                          </a>
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No location data available.</p>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Locations;