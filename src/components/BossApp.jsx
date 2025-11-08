
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Car, Users, BarChart2, User as UserIcon, Map, PlusCircle, Calendar } from 'lucide-react';
import MyAccount from '@/components/tabs/MyAccount';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import PendingTrips from '@/components/boss/PendingTrips';
import NextTrips from '@/components/boss/NextTrips';
import CreateTrip from '@/components/boss/CreateTrip';
import ManageVehicles from '@/components/boss/ManageVehicles';
import ManageDrivers from '@/components/boss/ManageDrivers';
import EarningsDashboard from '@/components/boss/EarningsDashboard';
import Locations from '@/components/boss/Locations';

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

const BossApp = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const { toast } = useToast();

  const [data, setData] = useState({
    trips: [],
    tripEvents: [],
    vehicles: [],
    drivers: [],
    users: [],
    locations: [],
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsRefreshing(true);

    try {
      const [tripsRes, eventsRes, vehiclesRes, usersRes, locationsRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('trip_events').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('users').select('*, driver_details:drivers(user_id)'),
        supabase.from('location_updates').select('*, driver:users(id, name, avatar_path)'),
      ]);

      if (tripsRes.error) throw tripsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (usersRes.error) throw usersRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setData({
        trips: tripsRes.data,
        tripEvents: eventsRes.data,
        vehicles: vehiclesRes.data,
        users: usersRes.data,
        drivers: usersRes.data.filter(u => u.role === 'Driver'),
        locations: locationsRes.data,
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: error.message,
      });
      // Set empty arrays on error to prevent undefined props
      setData({
        trips: [],
        tripEvents: [],
        vehicles: [],
        users: [],
        drivers: [],
        locations: [],
      });
    } finally {
      if (isInitial) setInitialLoading(false);
      else setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData(true);
    
    const channel = supabase.channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Change received!', payload);
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setActiveTab('create');
  };

  const handleResetCreate = () => {
    setEditingTrip(null);
  };

  const tabs = [
    { id: 'pending', label: 'Pending', icon: Briefcase, color: 'text-orange-400' },
    { id: 'next', label: 'Next', icon: Calendar, color: 'text-blue-400' },
    { id: 'create', label: editingTrip ? 'Edit Trip' : 'Create', icon: PlusCircle, color: 'text-green-400' },
    { id: 'locations', label: 'Locations', icon: Map, color: 'text-cyan-400' },
    { id: 'drivers', label: 'Drivers', icon: Users, color: 'text-purple-400' },
    { id: 'earnings', label: 'Earnings', icon: BarChart2, color: 'text-yellow-400' },
    { id: 'account', label: 'Account', icon: UserIcon, color: 'text-gray-400' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pending':
        return <PendingTrips 
          trips={data.trips || []} 
          users={data.users || []} 
          drivers={data.drivers || []} 
          refreshData={fetchData}
          onEditTrip={handleEditTrip}
        />;
      case 'next':
        return <NextTrips trips={data.trips || []} users={data.users || []} drivers={data.drivers || []} refreshData={fetchData} />;
      case 'create':
        return <CreateTrip 
          vehicles={data.vehicles || []} 
          drivers={data.drivers || []} 
          users={data.users || []} 
          refreshData={fetchData} 
          allTrips={data.trips || []}
          editingTrip={editingTrip}
          onResetCreate={handleResetCreate}
        />;
      case 'locations':
        return <Locations locations={data.locations || []} refreshData={fetchData} />;
      case 'drivers':
        return <ManageDrivers drivers={data.drivers || []} bossId={user.id} refreshData={fetchData} allTrips={data.trips || []} />;
      case 'earnings':
        return <EarningsDashboard trips={data.trips || []} tripEvents={data.tripEvents || []} users={data.users || []} />;
      case 'account':
        return <MyAccount user={user} onLogout={onLogout} />;
      default:
        return null;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
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
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">Boss Dashboard</h1>
              <p className="text-gray-300 text-sm">Welcome, {user.name}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 p-4 pb-20 overflow-y-auto">
        {renderTabContent()}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 p-2 backdrop-blur-md"
      >
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Reset edit mode when switching tabs (except when going to create for editing)
                  if (tab.id !== 'create') {
                    setEditingTrip(null);
                  }
                }}
                className={`flex flex-col items-center p-1 rounded-lg transition-all duration-200 flex-1 ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : tab.color}`} />
                <span className="text-xs font-medium text-center">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default BossApp;
