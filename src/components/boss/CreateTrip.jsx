
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Plus, Minus, Search, History, Loader2, User, Mail, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import _ from 'lodash';

const AddressInput = ({ label, value, onChange, onSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      // Try different search strategies for better results
      const searchQueries = [
        `${query}, New Jersey, USA`,
        `${query}, NJ, USA`, 
        `${query}, USA`
      ];
      
      let data = [];
      
      // Try each search query until we get results
      for (const searchQuery of searchQueries) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&countrycodes=us`);
          
          if (response.ok) {
            const text = await response.text();
            const parsedData = JSON.parse(text);
            
            if (parsedData && parsedData.length > 0) {
              data = parsedData;
              break;
            }
          }
        } catch (err) {
          // Continue to next search query
          continue;
        }
      }
      
      setSuggestions(data);
    } catch (error) {
      // Silently handle address API errors - don't log to console
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(_.debounce(fetchSuggestions, 300), []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedFetch(newValue);
  };

  const handleSelectSuggestion = (suggestion) => {
    onSelect(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <Label className="text-gray-300">{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
      {loading && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-gray-400" />}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-slate-800 border border-slate-700 rounded-md mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => handleSelectSuggestion(s)}
              className="p-2 hover:bg-slate-700 cursor-pointer text-sm text-white"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const RiderHistoryModal = ({ trips, onClose, driverMap }) => (
    <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="glass text-white max-w-2xl">
            <DialogHeader>
                <DialogTitle>Rider's Past Trips</DialogTitle>
                <DialogDescription>Showing a summary of past trips for this rider.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {trips.length > 0 ? (
                    <div className="space-y-3">
                        {trips.map(trip => (
                            <div key={trip.id} className="bg-white/5 p-3 rounded-lg text-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold">{new Date(trip.pickup_time).toLocaleDateString()}</span>
                                    <span className="font-bold text-green-400">${trip.total_price}</span>
                                </div>
                                <p className="text-gray-300 truncate"><strong>From:</strong> {trip.pickup_address}</p>
                                <p className="text-gray-300 truncate"><strong>To:</strong> {trip.dropoff_address}</p>
                                <p className="text-gray-400"><strong>Driver:</strong> {driverMap[trip.driver_id]?.name || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-8">No past trips found for this rider.</p>
                )}
            </div>
            <DialogFooter>
                <Button onClick={onClose} variant="outline" className="text-white border-white/20 hover:bg-white/10">Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

const CreateTrip = ({ vehicles = [], drivers = [], users = [], refreshData, allTrips = [] }) => {
  const initialState = {
    customer_phone: '',
    customer_name: '',
    customer_email: '',
    pickup_address: '',
    pickup_latitude: null,
    pickup_longitude: null,
    dropoff_address: '',
    dropoff_latitude: null,
    dropoff_longitude: null,
    pickup_date: new Date(),
    pickup_time: '12:00',
    passenger_count: 1,
    child_seats: 0,
    has_pets: false,
    selected_vehicle_id: '',
    total_price: '',
    airline: '',
    flight_number: '',
    arrival_date: null,
    arrival_time: '12:00',
    driver_id: '',
    driver_notes: '',
  };
  
  const [formState, setFormState] = useState(initialState);
  const [rider, setRider] = useState(null);
  const [riderHistory, setRiderHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showChildSeatInput, setShowChildSeatInput] = useState(false);
  const [isPickupDateOpen, setIsPickupDateOpen] = useState(false);
  const [isArrivalDateOpen, setIsArrivalDateOpen] = useState(false);
  
  const { toast } = useToast();

  const driverMap = React.useMemo(() => {
    if (!users || !Array.isArray(users)) return {};
    return users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});
  }, [users]);

  const handlePhoneSearch = useCallback(async () => {
    if (formState.customer_phone.length < 10) return;
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('phone', formState.customer_phone)
      .eq('role', 'Normal Rider')
      .single();

    if (data) {
      setRider(data);
      setFormState(prev => ({
        ...prev,
        customer_name: data.name,
        customer_email: data.email,
      }));
      toast({ title: "Rider Found", description: `Details for ${data.name} have been auto-filled.` });
      const riderTrips = (allTrips || []).filter(t => t.rider_id === data.id).sort((a,b) => new Date(b.pickup_time) - new Date(a.pickup_time));
      setRiderHistory(riderTrips);
    } else {
      setRider(null);
      setRiderHistory([]);
      toast({ title: "New Rider", description: "No existing rider found. A new profile will be created." });
    }
  }, [formState.customer_phone, supabase, toast, allTrips]);
  
  const debouncedPhoneSearch = useCallback(_.debounce(handlePhoneSearch, 500), [handlePhoneSearch]);

  useEffect(() => {
    debouncedPhoneSearch();
    return () => debouncedPhoneSearch.cancel();
  }, [formState.customer_phone, debouncedPhoneSearch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumericChange = (field, delta) => {
    setFormState(prev => ({
      ...prev,
      [field]: Math.max(field === 'passenger_count' ? 1 : 0, (prev[field] || 0) + delta),
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    let riderId = rider?.id;

    if (!riderId) {
        const { data: newRider, error: riderError } = await supabase
            .from('users')
            .insert({
                phone: formState.customer_phone,
                name: formState.customer_name,
                email: formState.customer_email,
                role: 'Normal Rider',
                is_verified: true,
                system_date: new Date().toISOString(),
                avatar_version: 0,
            })
            .select()
            .single();

        if (riderError) {
            toast({ variant: "destructive", title: "Error creating rider", description: riderError.message });
            return;
        }
        riderId = newRider.id;
    }

    // Combine date and time for pickup - adjust for timezone
    const [hours, minutes] = formState.pickup_time.split(':');
    const pickupDateTime = new Date(formState.pickup_date);
    pickupDateTime.setHours(parseInt(hours) - 4, parseInt(minutes), 0, 0); // -4 hours to compensate for timezone
    
    // Combine date and time for arrival (if provided) - adjust for timezone
    let arrivalDateTime = null;
    if (formState.arrival_date) {
      const [arrHours, arrMinutes] = formState.arrival_time.split(':');
      arrivalDateTime = new Date(formState.arrival_date);
      arrivalDateTime.setHours(parseInt(arrHours) - 4, parseInt(arrMinutes), 0, 0); // -4 hours to compensate for timezone
    }

    const { error: tripError } = await supabase.from('trips').insert({
        rider_id: riderId,
        driver_id: formState.driver_id || null,
        pickup_address: formState.pickup_address,
        dropoff_address: formState.dropoff_address,
        pickup_time: pickupDateTime.toISOString(),
        passenger_count: formState.passenger_count,
        child_seats: showChildSeatInput ? formState.child_seats : 0,
        has_pets: formState.has_pets,
        selected_vehicle_id: formState.selected_vehicle_id || null,
        status: 'Pending',
        total_price: parseFloat(formState.total_price),
        airline: formState.airline || null,
        flight_number: formState.flight_number || null,
        arrival_time: arrivalDateTime ? arrivalDateTime.toISOString() : null,
        driver_notes: formState.driver_notes || null,
        is_round_trip: false,
        pickup_latitude: formState.pickup_latitude,
        pickup_longitude: formState.pickup_longitude,
        dropoff_latitude: formState.dropoff_latitude,
        dropoff_longitude: formState.dropoff_longitude,
        system_date: new Date().toISOString()
    });
    
    if (tripError) {
        toast({ variant: "destructive", title: "Error creating trip", description: tripError.message });
    } else {
        toast({ title: "Success!", description: "New trip has been created." });
        setFormState(initialState);
        setRider(null);
        setRiderHistory([]);
        refreshData();
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Create New Trip</h2>

        {isHistoryModalOpen && (
            <RiderHistoryModal trips={riderHistory} onClose={() => setIsHistoryModalOpen(false)} driverMap={driverMap} />
        )}

        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-400/20 pb-2">Customer Details</h3>
                    <div className="relative">
                        <Label htmlFor="customer_phone" className="text-gray-300 flex items-center"><Phone className="w-4 h-4 mr-2"/>Phone Number</Label>
                        <Input id="customer_phone" name="customer_phone" value={formState.customer_phone} onChange={handleChange} className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"/>
                        {riderHistory.length > 0 && 
                            <Button type="button" size="sm" variant="ghost" onClick={() => setIsHistoryModalOpen(true)} className="absolute right-1 top-7 text-xs text-purple-400 hover:text-purple-300">
                                <History className="w-4 h-4 mr-1"/>History
                            </Button>
                        }
                    </div>
                     <div>
                        <Label htmlFor="customer_name" className="text-gray-300 flex items-center"><User className="w-4 h-4 mr-2"/>Name</Label>
                        <Input id="customer_name" name="customer_name" value={formState.customer_name} onChange={handleChange} className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"/>
                    </div>
                    <div>
                        <Label htmlFor="customer_email" className="text-gray-300 flex items-center"><Mail className="w-4 h-4 mr-2"/>Email</Label>
                        <Input id="customer_email" type="email" name="customer_email" value={formState.customer_email} onChange={handleChange} className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"/>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-400/20 pb-2">Trip Details</h3>
                    <AddressInput
                        label="Pickup Address"
                        value={formState.pickup_address}
                        onChange={(v) => setFormState(p => ({ ...p, pickup_address: v }))}
                        onSelect={(s) => setFormState(p => ({ ...p, pickup_address: s.display_name.replace("Amerika Birleşik Devletleri", "USA"), pickup_latitude: parseFloat(s.lat), pickup_longitude: parseFloat(s.lon) }))}
                    />
                    <AddressInput
                        label="Dropoff Address"
                        value={formState.dropoff_address}
                        onChange={(v) => setFormState(p => ({ ...p, dropoff_address: v }))}
                        onSelect={(s) => setFormState(p => ({ ...p, dropoff_address: s.display_name.replace("Amerika Birleşik Devletleri", "USA"), dropoff_latitude: parseFloat(s.lat), dropoff_longitude: parseFloat(s.lon) }))}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-300">Pickup Date</Label>
                            <Popover open={isPickupDateOpen} onOpenChange={setIsPickupDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal text-white border-white/20 hover:bg-white/10 bg-transparent">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formState.pickup_date ? format(formState.pickup_date, "PPP") : "Select date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 glass text-white">
                                    <Calendar 
                                        mode="single" 
                                        selected={formState.pickup_date} 
                                        onSelect={(d) => {
                                            setFormState(p => ({...p, pickup_date: d}));
                                            setIsPickupDateOpen(false);
                                        }} 
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        initialFocus 
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label className="text-gray-300">Pickup Time</Label>
                            <div className="relative">
                                <Input
                                    type="time"
                                    value={formState.pickup_time}
                                    onChange={(e) => setFormState(p => ({...p, pickup_time: e.target.value}))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                                <Clock className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                    <Label className="text-gray-300">Passengers</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Button type="button" size="icon" variant="outline" onClick={() => handleNumericChange('passenger_count', -1)} className="w-8 h-8"><Minus className="w-4 h-4"/></Button>
                        <Input type="number" value={formState.passenger_count} readOnly className="w-12 text-center bg-transparent border-0 text-white font-medium"/>
                        <Button type="button" size="icon" variant="outline" onClick={() => handleNumericChange('passenger_count', 1)} className="w-8 h-8"><Plus className="w-4 h-4"/></Button>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="child_seats_check" checked={showChildSeatInput} onCheckedChange={setShowChildSeatInput} />
                    <Label htmlFor="child_seats_check" className="text-gray-300">Child Seats</Label>
                </div>
                <AnimatePresence>
                {showChildSeatInput && 
                    <motion.div initial={{opacity:0, width: 0}} animate={{opacity:1, width: 'auto'}} exit={{opacity:0, width: 0}}>
                        <Label className="text-gray-300">Count</Label>
                         <div className="flex items-center gap-2 mt-1">
                            <Button type="button" size="icon" variant="outline" onClick={() => handleNumericChange('child_seats', -1)} className="w-8 h-8"><Minus className="w-4 h-4"/></Button>
                            <Input name="child_seats" type="number" value={formState.child_seats} readOnly className="w-12 text-center bg-white/10 border-white/20 text-white font-medium cursor-not-allowed"/>
                            <Button type="button" size="icon" variant="outline" onClick={() => handleNumericChange('child_seats', 1)} className="w-8 h-8"><Plus className="w-4 h-4"/></Button>
                        </div>
                    </motion.div>
                }
                </AnimatePresence>
                <div className="flex items-center space-x-2">
                    <Checkbox id="has_pets" name="has_pets" checked={formState.has_pets} onCheckedChange={(c) => setFormState(p => ({...p, has_pets: c}))} />
                    <Label htmlFor="has_pets" className="text-gray-300">Has Pets</Label>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <Label className="text-gray-300">Vehicle</Label>
                    <Select value={formState.selected_vehicle_id || "none"} onValueChange={(v) => setFormState(p => ({...p, selected_vehicle_id: v === "none" ? "" : v}))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-700">
                            <SelectItem value="none">Select a vehicle</SelectItem>
                            {(vehicles || []).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-gray-300">Assigned Driver</Label>
                    <Select value={formState.driver_id || "none"} onValueChange={(v) => setFormState(p => ({...p, driver_id: v === "none" ? "" : v}))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Assign a driver (optional)" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-700">
                             <SelectItem value="none">None</SelectItem>
                            {(drivers || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="total_price" className="text-gray-300">Total Price ($)</Label>
                    <Input id="total_price" name="total_price" type="number" step="0.01" value={formState.total_price} onChange={handleChange} className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" placeholder="0.00"/>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-400/20 pb-2 mb-4">Airport Information (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="airline" className="text-gray-300">Airline</Label>
                        <Input id="airline" name="airline" value={formState.airline} onChange={handleChange} className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" placeholder="e.g. United Airlines"/>
                    </div>
                    <div>
                        <Label htmlFor="flight_number" className="text-gray-300">Flight Number</Label>
                        <Input id="flight_number" name="flight_number" value={formState.flight_number} onChange={handleChange} className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" placeholder="e.g. UA123"/>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-300">Arrival Date</Label>
                            <Popover open={isArrivalDateOpen} onOpenChange={setIsArrivalDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal text-white border-white/20 hover:bg-white/10 bg-transparent">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formState.arrival_date ? format(formState.arrival_date, "PPP") : "Select date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 glass text-white">
                                    <Calendar 
                                        mode="single" 
                                        selected={formState.arrival_date} 
                                        onSelect={(d) => {
                                            setFormState(p => ({...p, arrival_date: d}));
                                            setIsArrivalDateOpen(false);
                                        }} 
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label className="text-gray-300">Arrival Time</Label>
                            <div className="relative">
                                <Input
                                    type="time"
                                    value={formState.arrival_time}
                                    onChange={(e) => setFormState(p => ({...p, arrival_time: e.target.value}))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                                <Clock className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <Label htmlFor="driver_notes" className="text-gray-300">Driver Notes</Label>
                <textarea id="driver_notes" name="driver_notes" value={formState.driver_notes} onChange={handleChange} rows="3" className="w-full bg-white/10 border-white/20 rounded-md p-3 text-white placeholder:text-gray-400 resize-none" placeholder="Any special instructions for the driver..."></textarea>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg">Create Trip</Button>
            </div>
        </form>
    </motion.div>
  );
};

export default CreateTrip;
