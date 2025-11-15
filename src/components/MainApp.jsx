import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Clock, DollarSign, User, MapPin } from 'lucide-react';
import CurrentTrips from '@/components/tabs/CurrentTrips';
import NextTrips from '@/components/tabs/NextTrips';
import PastTrips from '@/components/tabs/PastTrips';
import MyWallet from '@/components/tabs/MyWallet';
import MyAccount from '@/components/tabs/MyAccount';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ProgressBar = () => (
  <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-blue-500/20">
    <motion.div
      className="h-full bg-blue-500"
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{
        repeat: Infinity,
        repeatType: "loop",
        duration: 1.5,
        ease: "linear",
      }}
    />
  </div>
);

const MainApp = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('current');
  const [trips, setTrips] = useState([]);
  const [tripEvents, setTripEvents] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const { toast } = useToast();
  const locationIntervalRef = useRef(null);

  const fetchTripsAndEvents = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*');

    const { data: eventsData, error: eventsError } = await supabase
      .from('trip_events')
      .select('*');

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*');

    if (tripsError || eventsError || vehiclesError) {
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: tripsError?.message || eventsError?.message || vehiclesError?.message,
      });
    } else {
      setTrips(tripsData);
      setTripEvents(eventsData);
      setVehicles(vehiclesData);
    }
    
    if (isInitial) {
      setInitialLoading(false);
    } else {
      setIsRefreshing(false);
    }
  }, [toast]);

  const getAdjustedTimestamp = () => {
    const now = new Date();
    now.setHours(now.getHours() - 4);
    return now.toISOString();
  };

  const updateLocation = useCallback(async (isInitialTest = false) => {
    if (!user?.id) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        let { data: activeTrip } = await supabase
          .from('trips')
          .select('id')
          .eq('driver_id', user.id)
          .eq('status', 'En Route')
          .single();

        let tripId = activeTrip?.id;

        const { error } = await supabase
          .from('location_updates')
          .upsert({
            driver_id: user.id,
            trip_id: tripId,
            latitude,
            longitude,
            timestamp: getAdjustedTimestamp(),
            system_date: getAdjustedTimestamp(),
          }, { onConflict: 'driver_id' });

        if (error) {
          console.error('Error updating location:', error);
          toast({
            variant: "destructive",
            title: "Location Update Failed",
            description: "Could not save location to the database. " + error.message,
          });
        } else if (isInitialTest) {
          toast({
            title: "Location Tracking Active",
            description: "Your location is now being shared.",
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          variant: "destructive",
          title: "Location Error",
          description: "Could not get location. Please ensure location services are enabled and permissions are granted.",
        });
      },
      { enableHighAccuracy: true }
    );
  }, [user, toast]);

  const startLocationTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    updateLocation(true); // Initial update with test flag
    locationIntervalRef.current = setInterval(() => updateLocation(false), 30000);
  }, [updateLocation]);

  const requestLocationPermission = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          startLocationTracking();
        } else if (result.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(
            () => startLocationTracking(),
            (error) => {
              console.error("Error getting location permission:", error);
              toast({
                variant: "destructive",
                title: "Location Permission Denied",
                description: "Location access is required for trip tracking.",
              });
            }
          );
        } else if (result.state === 'denied') {
           toast({
            variant: "destructive",
            title: "Location Permission Denied",
            description: "Please enable location permissions in your browser settings to use tracking features.",
          });
        }
      });
    } else {
      toast({
        variant: "destructive",
        title: "Geolocation not supported",
        description: "Your browser does not support location tracking.",
      });
    }
  }, [startLocationTracking, toast]);

  useEffect(() => {
    fetchTripsAndEvents(true);
    requestLocationPermission();

    const tripsChannel = supabase
      .channel('public:trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' },
        () => fetchTripsAndEvents()
      )
      .subscribe();

    const tripEventsChannel = supabase
      .channel('public:trip_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_events' },
        () => fetchTripsAndEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(tripEventsChannel);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [fetchTripsAndEvents, requestLocationPermission]);

  const tabs = [
    { id: 'current', label: 'Current', icon: Car, color: 'text-blue-500' },
    { id: 'next', label: 'Next', icon: Clock, color: 'text-purple-500' },
    { id: 'past', label: 'Past', icon: MapPin, color: 'text-green-500' },
    { id: 'wallet', label: 'Wallet', icon: DollarSign, color: 'text-yellow-500' },
    { id: 'account', label: 'Account', icon: User, color: 'text-gray-500' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'current':
        return <CurrentTrips trips={trips} tripEvents={tripEvents} user={user} refreshTrips={fetchTripsAndEvents} />;
      case 'next':
        return <NextTrips trips={trips} user={user} vehicles={vehicles} refreshTrips={fetchTripsAndEvents} />;
      case 'past':
        return <PastTrips trips={trips} tripEvents={tripEvents} user={user} />;
      case 'wallet':
        return <MyWallet trips={trips} tripEvents={tripEvents} user={user} />;
      case 'account':
        return <MyAccount user={user} onLogout={onLogout} />;
      default:
        return <CurrentTrips trips={trips} tripEvents={tripEvents} user={user} refreshTrips={fetchTripsAndEvents} />;
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AnimatePresence>
        {isRefreshing && <ProgressBar />}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass border-b border-white/10 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">LimoDriver</h1>
              <p className="text-gray-300 text-sm">Welcome, {user.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                timeZone: 'America/New_York'
              })}
            </p>
            <p className="text-gray-300 text-xs">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/New_York'
              })} NY Time
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 p-4 pb-20">
        {renderTabContent()}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-black/55 border-t border-white/10 p-2 backdrop-blur-md"
      >
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : tab.color}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default MainApp;