export const generateMockTrips = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return [
    // Current trips (accepted, started, passenger_picked)
    {
      id: '1',
      rider_id: 'rider1',
      driver_id: '1',
      pickup_address: '123 Airport Terminal, LAX',
      dropoff_address: '456 Beverly Hills Hotel, Beverly Hills',
      stop_address: null,
      pickup_time: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      passenger_count: 2,
      child_seats: 0,
      luggage_count: 3,
      has_pets: false,
      selected_vehicle_id: 'vehicle1',
      status: 'Accepted',
      total_price: 125.00,
      airline: 'American Airlines',
      flight_number: 'AA1234',
      arrival_time: new Date(today.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
      driver_notes: null,
      is_round_trip: false,
      pickup_latitude: 33.9425,
      pickup_longitude: -118.4081,
      dropoff_latitude: 34.0901,
      dropoff_longitude: -118.4065,
      system_date: new Date().toISOString()
    },
    {
      id: '2',
      rider_id: 'rider2',
      driver_id: '1',
      pickup_address: '789 Corporate Center, Downtown LA',
      dropoff_address: '321 Sunset Strip, West Hollywood',
      stop_address: '555 Restaurant Row, Hollywood',
      pickup_time: new Date(today.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      passenger_count: 4,
      child_seats: 1,
      luggage_count: 0,
      has_pets: false,
      selected_vehicle_id: 'vehicle2',
      status: 'Started',
      total_price: 89.50,
      airline: null,
      flight_number: null,
      arrival_time: null,
      driver_notes: 'Corporate client - VIP service',
      is_round_trip: true,
      pickup_latitude: 34.0522,
      pickup_longitude: -118.2437,
      dropoff_latitude: 34.0901,
      dropoff_longitude: -118.3617,
      system_date: new Date().toISOString()
    },
    
    // Next trips (pending)
    {
      id: '3',
      rider_id: 'rider3',
      driver_id: null,
      pickup_address: '999 Wedding Venue, Malibu',
      dropoff_address: '777 Luxury Resort, Santa Monica',
      stop_address: null,
      pickup_time: new Date(today.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      passenger_count: 6,
      child_seats: 0,
      luggage_count: 2,
      has_pets: false,
      selected_vehicle_id: 'vehicle3',
      status: 'Pending',
      total_price: 275.00,
      airline: null,
      flight_number: null,
      arrival_time: null,
      driver_notes: null,
      is_round_trip: false,
      pickup_latitude: 34.0259,
      pickup_longitude: -118.7798,
      dropoff_latitude: 34.0195,
      dropoff_longitude: -118.4912,
      system_date: new Date().toISOString()
    },
    {
      id: '4',
      rider_id: 'rider4',
      driver_id: null,
      pickup_address: '111 Business District, Century City',
      dropoff_address: '222 International Airport, LAX',
      stop_address: null,
      pickup_time: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
      passenger_count: 1,
      child_seats: 0,
      luggage_count: 2,
      has_pets: false,
      selected_vehicle_id: 'vehicle1',
      status: 'Pending',
      total_price: 95.00,
      airline: 'Delta Airlines',
      flight_number: 'DL5678',
      arrival_time: null,
      driver_notes: null,
      is_round_trip: false,
      pickup_latitude: 34.0522,
      pickup_longitude: -118.2615,
      dropoff_latitude: 33.9425,
      dropoff_longitude: -118.4081,
      system_date: new Date().toISOString()
    },
    
    // Past trips (completed)
    {
      id: '5',
      rider_id: 'rider5',
      driver_id: '1',
      pickup_address: '333 Hotel California, Hollywood',
      dropoff_address: '444 Shopping Center, Beverly Hills',
      stop_address: null,
      pickup_time: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      passenger_count: 3,
      child_seats: 0,
      luggage_count: 5,
      has_pets: true,
      selected_vehicle_id: 'vehicle2',
      status: 'Completed',
      total_price: 156.75,
      airline: null,
      flight_number: null,
      arrival_time: null,
      driver_notes: 'Customer had small dog - very well behaved',
      is_round_trip: false,
      pickup_latitude: 34.0928,
      pickup_longitude: -118.3287,
      dropoff_latitude: 34.0736,
      dropoff_longitude: -118.4004,
      system_date: new Date().toISOString()
    },
    {
      id: '6',
      rider_id: 'rider6',
      driver_id: '1',
      pickup_address: '666 Concert Hall, Downtown LA',
      dropoff_address: '888 Luxury Apartments, West LA',
      stop_address: null,
      pickup_time: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      passenger_count: 2,
      child_seats: 0,
      luggage_count: 0,
      has_pets: false,
      selected_vehicle_id: 'vehicle1',
      status: 'Completed',
      total_price: 78.25,
      airline: null,
      flight_number: null,
      arrival_time: null,
      driver_notes: 'Late night pickup after concert',
      is_round_trip: false,
      pickup_latitude: 34.0522,
      pickup_longitude: -118.2437,
      dropoff_latitude: 34.0522,
      dropoff_longitude: -118.4435,
      system_date: new Date().toISOString()
    }
  ];
};

export const generateTripEvents = () => {
  return [
    {
      id: 'event1',
      trip_id: '5',
      event_type: 'accepted',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event2',
      trip_id: '5',
      event_type: 'started',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event3',
      trip_id: '5',
      event_type: 'passenger_picked',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event4',
      trip_id: '5',
      event_type: 'completed',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event5',
      trip_id: '6',
      event_type: 'accepted',
      timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event6',
      trip_id: '6',
      event_type: 'started',
      timestamp: new Date(Date.now() - 24.5 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event7',
      trip_id: '6',
      event_type: 'passenger_picked',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    },
    {
      id: 'event8',
      trip_id: '6',
      event_type: 'completed',
      timestamp: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
      driver_id: '1'
    }
  ];
};