import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Clock, Users, Plane, Baby, Luggage, PawPrint, DollarSign, User as UserIcon, Phone, Edit3, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
const TripModal = ({
  trip,
  tripEvents,
  rider,
  user,
  onClose,
  onUpdateStatus,
  onAcceptTrip,
  onRecordPickup,
  onEditTrip,
  type
}) => {
  const formatTime = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York'
    });
  };
  const calculateTripDurationInHours = tripId => {
    if (!tripEvents) return 0;
    const pickedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'passenger_picked');
    const completedEvent = tripEvents.find(e => e.trip_id === tripId && e.event_type === 'completed');
    if (pickedEvent && completedEvent) {
      const durationMs = new Date(completedEvent.timestamp) - new Date(pickedEvent.timestamp);
      return durationMs / (1000 * 60 * 60);
    }
    return 0;
  };
  const formatDuration = durationInHours => {
    if (durationInHours <= 0) return 'N/A';
    const hours = Math.floor(durationInHours);
    const minutes = Math.round((durationInHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };
  const calculateEarnings = tripId => {
    const durationInHours = calculateTripDurationInHours(tripId);
    const hourlyRate = user?.hourly_rate || 0;
    return (durationInHours * hourlyRate).toFixed(2);
  };

  const getGoogleMapsUrl = (address) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // Get trip events for this specific trip
  const tripEventList = useMemo(() => {
    if (!tripEvents || !trip) return [];
    return tripEvents
      .filter(event => event.trip_id === trip.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [tripEvents, trip]);

  const eventsSectionRef = useRef(null);

  // Format event type for display
  const formatEventType = (eventType) => {
    const eventMap = {
      'en_route': 'En Route',
      'passenger_picked': 'Passenger Picked Up',
      'completed': 'Trip Completed',
      'cancelled': 'Trip Cancelled',
      'confirmed': 'Trip Confirmed',
      'pending': 'Trip Pending'
    };
    return eventMap[eventType] || eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'en_route':
        return '🚗';
      case 'passenger_picked':
        return '👤';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      case 'confirmed':
        return '✓';
      default:
        return '📋';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'en_route':
        return 'text-blue-400';
      case 'passenger_picked':
        return 'text-purple-400';
      case 'completed':
        return 'text-green-400';
      case 'cancelled':
        return 'text-red-400';
      case 'confirmed':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        timeZone: 'America/New_York'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/New_York'
      })
    };
  };

  const getActionButton = () => {
    if (type === 'next') {
      return <Button onClick={() => onAcceptTrip(trip.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-lg">
          START TRIP
        </Button>;
    }
    if (type === 'current') {
      const hasPickedUp = tripEvents?.some(e => e.trip_id === trip.id && e.event_type === 'passenger_picked');
      if (trip.status === 'En Route' && !hasPickedUp) {
        return <Button onClick={() => onRecordPickup(trip.id)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-4 text-lg">
            PICKED UP PASSENGER
          </Button>;
      }
      if (trip.status === 'En Route' && hasPickedUp) {
        return <Button onClick={() => onUpdateStatus(trip.id, 'Completed', 'completed')} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 text-lg">
            COMPLETE TRIP
          </Button>;
      }
    }
    return null;
  };
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{
      y: 100,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} exit={{
      y: 100,
      opacity: 0
    }} transition={{
      type: "spring",
      damping: 25,
      stiffness: 300
    }} className="glass rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-white text-xl font-semibold">Trip Details</h2>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {rider && (type === 'current' || type === 'boss_view') && <div className="bg-white/5 rounded-lg p-4 flex items-center space-x-4">
              {rider.avatar_path ? <img-replace src={`https://zsrcny.supabase.co/storage/v1/object/public/limonjphoto/${rider.avatar_path}`} alt={rider.name} className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-gray-400" />
                </div>}
              <div>
                <p className="text-white font-semibold text-lg">{rider.name}</p>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${rider.phone}`} className="hover:underline">{rider.phone}</a>
                </div>
              </div>
            </div>}

          <div className="text-center">
            <p className="text-white text-2xl font-bold">{formatTime(trip.pickup_time)}</p>
            <p className="text-gray-300">{formatDate(trip.pickup_time)}</p>
            <p className="text-gray-400 text-xs mt-1">NY Time (EST/EDT)</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-white font-medium">Pickup Location</p>
                <a href={getGoogleMapsUrl(trip.pickup_address)} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-sm hover:underline">{trip.pickup_address}</a>
              </div>
            </div>

            {trip.stop_address && <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-white font-medium">Stop</p>
                  <a href={getGoogleMapsUrl(trip.stop_address)} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-sm hover:underline">{trip.stop_address}</a>
                </div>
              </div>}

            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-white font-medium">Dropoff Location</p>
                <a href={getGoogleMapsUrl(trip.dropoff_address)} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-sm hover:underline">{trip.dropoff_address}</a>
              </div>
            </div>
          </div>

          {trip.airline && <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Plane className="w-5 h-5 text-blue-400" />
                <p className="text-blue-400 font-medium">Flight Information</p>
              </div>
              <div className="space-y-1">
                <p className="text-white">{trip.airline} - {trip.flight_number}</p>
                {trip.arrival_time && <p className="text-gray-300 text-sm">
                    Arrival: {formatTime(trip.arrival_time)}
                  </p>}
              </div>
            </div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">{trip.passenger_count}</span>
              </div>
              <p className="text-gray-400 text-xs">Passengers</p>
            </div>

            {trip.child_seats > 0 && <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Baby className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-medium">{trip.child_seats}</span>
                </div>
                <p className="text-gray-400 text-xs">Child Seats</p>
              </div>}

            {trip.luggage_count > 0 && <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Luggage className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-medium">{trip.luggage_count}</span>
                </div>
                <p className="text-gray-400 text-xs">Luggage</p>
              </div>}

            {trip.has_pets && <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <PawPrint className="w-4 h-4 text-pink-400" />
                  <span className="text-white font-medium">Yes</span>
                </div>
                <p className="text-gray-400 text-xs">Pets</p>
              </div>}
          </div>

          {trip.driver_notes && <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Notes</p>
              <p className="text-gray-300 text-sm">{trip.driver_notes}</p>
            </div>}

          {tripEventList.length > 0 && (
            <div ref={eventsSectionRef} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <p className="text-white font-medium">Trip Events Timeline</p>
                </div>
                <p className="text-gray-400 text-xs">NY Time (EST/EDT)</p>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {tripEventList.map((event, index) => {
                  const dateTime = formatDateTime(event.timestamp);
                  return (
                    <div key={event.id || index} className="flex items-start space-x-3 pb-3 border-b border-white/10 last:border-0 last:pb-0">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">
                          {getEventIcon(event.event_type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${getEventColor(event.event_type)}`}>
                          {formatEventType(event.event_type)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-gray-400 text-xs">
                            {dateTime.date} at {dateTime.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {type === 'current' && (
            <div className="sticky bottom-0">
              {getActionButton()}
            </div>
          )}

          {type === 'past' && trip.status === 'Completed' && <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-medium">Trip Duration</p>
                  <p className="text-white text-lg">{formatDuration(calculateTripDurationInHours(trip.id))}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-medium">Earnings</p>
                  <p className="text-white text-lg">${calculateEarnings(trip.id)}</p>
                </div>
              </div>
            </div>}

          <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Trip Total</span>
              </div>
              <span className="text-white text-2xl font-bold">${trip.total_price}</span>
            </div>
            {type !== 'past' && <p className="text-gray-300 text-sm mt-1"></p>}
          </div>

          {/* Edit Trip Button - Only for boss_view and pending trips */}
          {type === 'boss_view' && trip.status === 'Pending' && onEditTrip && (
            <Button 
              onClick={() => onEditTrip(trip)} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 text-base"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Trip
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>;
};
export default TripModal;