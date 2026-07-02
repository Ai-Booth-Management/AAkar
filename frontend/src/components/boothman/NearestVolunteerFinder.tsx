"use client";

import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface Volunteer {
  id: number;
  name: string;
  phone: string;
  lat: number | null;
  lng: number | null;
}

interface NearestVolunteerFinderProps {
  volunteers: Volunteer[];
}

interface SearchResult {
  volunteer: Volunteer;
  distanceKm: number;
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

export default function NearestVolunteerFinder({ volunteers }: NearestVolunteerFinderProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchedCoords, setSearchedCoords] = useState<{lat: number, lng: number} | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setSearchedCoords(null);

    try {
      let addressParts = address.split(',').map(part => part.trim());
      let foundData = null;

      while (addressParts.length > 0 && !foundData) {
        const query = encodeURIComponent(addressParts.join(', '));
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch from geocoding API');
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
          foundData = data[0];
          
          if (addressParts.length < address.split(',').length) {
            setError(`Exact location not found. Using approximate area: ${addressParts.join(', ')}`);
          }
        } else {
          addressParts.shift();
        }
      }
      
      if (!foundData) {
        setError('Address not found. Try a different search term.');
        setLoading(false);
        return;
      }

      const targetLat = parseFloat(foundData.lat);
      const targetLng = parseFloat(foundData.lon);
      setSearchedCoords({ lat: targetLat, lng: targetLng });

      // Calculate distances for volunteers with coordinates
      const distances: SearchResult[] = volunteers
        .filter(v => v.lat !== null && v.lng !== null)
        .map(v => ({
          volunteer: v,
          distanceKm: calculateDistance(targetLat, targetLng, v.lat!, v.lng!)
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3); // Get top 3

      setResults(distances);

    } catch (err) {
      console.error(err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
        <h3 className="m-0 text-sm font-bold text-aakar-navy uppercase tracking-wider flex items-center gap-2">
          <Navigation size={16} className="text-brand"/> 
          Nearest Volunteer Finder
        </h3>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin size={14} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand sm:text-sm"
            placeholder="Enter address (e.g., Naraina, Delhi)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-aakar-navy bg-brand hover:bg-yellow-400 focus:outline-none disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Find'}
        </button>
      </form>

      {error && (
        <div className="text-xs text-red-500 font-semibold mb-3 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {searchedCoords && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold mb-2">
            Top 3 nearest volunteers:
          </div>
          {results.map((result) => (
            <div key={result.volunteer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <div className="text-sm font-bold text-aakar-navy">{result.volunteer.name}</div>
                <div className="text-xs text-gray-500">{result.volunteer.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-brand">
                  {result.distanceKm < 1 
                    ? `${Math.round(result.distanceKm * 1000)} m` 
                    : `${result.distanceKm.toFixed(1)} km`}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Distance</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchedCoords && results.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          No volunteers with location data found.
        </div>
      )}
    </div>
  );
}
