import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Loader2, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const getAvatarUrl = (path) => {
  if (!path) return null;
  const { data } = supabase.storage.from('limonjphoto').getPublicUrl(path);
  return data.publicUrl;
};

const mockDriversInitial = [
  { id: 'mock1', name: 'Mock Driver A', lat: 40.7128, lon: -74.0060, step: 0.0005, avatar_path: null },
  { id: 'mock2', name: 'Mock Driver B', lat: 40.7580, lon: -73.9855, step: -0.0004, avatar_path: null },
  { id: 'mock3', name: 'Mock Driver C', lat: 40.7831, lon: -73.9712, step: 0.0006, avatar_path: null },
];

const AddressFetcher = ({ lat, lon }) => {
  const [address, setAddress] = useState('Loading address...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddress = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }
        const data = await response.json();
        setAddress(data.display_name || 'Address not found');
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setAddress('Could not retrieve address');
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


const Locations = ({ locations, refreshData }) => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [mockDrivers, setMockDrivers] = useState(mockDriversInitial);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
      setLastUpdated(new Date());
      
      setMockDrivers(prevDrivers => 
        prevDrivers.map(driver => ({
          ...driver,
          lat: driver.lat + driver.step * (Math.random() - 0.4),
          lon: driver.lon + driver.step * (Math.random() - 0.4),
        }))
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const allDriverLocations = useMemo(() => {
    const realDriverMarkers = locations.map(loc => ({
      id: loc.driver_id,
      lat: loc.latitude,
      lon: loc.longitude,
      name: loc.driver?.name || 'Unknown Driver',
      avatar_path: loc.driver?.avatar_path,
      isMock: false,
    }));

    const mockDriverMarkers = mockDrivers.map(driver => ({
      id: driver.id,
      lat: driver.lat,
      lon: driver.lon,
      name: driver.name,
      avatar_path: driver.avatar_path,
      isMock: true,
    }));

    return [...realDriverMarkers, ...mockDriverMarkers];
  }, [locations, mockDrivers]);

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
          {allDriverLocations.map((loc, index) => {
            const avatarUrl = getAvatarUrl(loc.avatar_path);
            return (
              <a
                key={loc.id + '-' + index}
                href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg flex items-start space-x-4 transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-lg ${loc.isMock ? 'bg-yellow-500/10 group-hover:bg-yellow-500/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'}`}
                >
                  <div className="relative flex-shrink-0">
                    {avatarUrl ? (
                      <img alt={loc.name} className="w-10 h-10 rounded-full object-cover" src={avatarUrl} />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-white">{loc.name} {loc.isMock && <span className="text-xs font-normal text-yellow-400">(Mock)</span>}</p>
                    <AddressFetcher lat={loc.lat} lon={loc.lon} />
                  </div>
                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>
              </a>
            )
          })}
        </div>
        {allDriverLocations.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-500" />
            <p className="mt-2 text-gray-400">No active drivers found.</p>
            <p className="text-sm text-gray-500">Locations will appear here when drivers are online.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Locations;