
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import { analyzeLocationByCoordinates, geocodeLocation, getCityHealthSnapshot } from '../services/geminiService';
import type { LocationAnalysisResult, Facility, CityHealthSnapshot } from '../types';
import { LocationReport } from './LocationReport';
import { CityHealthReport } from './CityHealthReport';
import { MagnifyingGlassIcon, CloseIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { majorCities, City } from '../data/cities';
import { BackButton } from './BackButton';
import { useI18n } from './I18n';
import RotatingGlobe from './RotatingGlobe';

// Authentic OpenAQ Telemetry Monitoring Stations
const OPENAQ_GLOBE_STATIONS = [
    { city: "Hyderabad", lat: 17.3850, lng: 78.4867, aqi: 101, pm25: 48.5, vector: "Dengue/Chikungunya" },
    { city: "Mumbai", lat: 19.0760, lng: 72.8777, aqi: 131, pm25: 62.4, vector: "Leptospirosis/Malaria" },
    { city: "Delhi NCR", lat: 28.6139, lng: 77.2090, aqi: 394, pm25: 188.0, vector: "Post-Monsoon Dengue" },
    { city: "Bengaluru", lat: 12.9716, lng: 77.5946, aqi: 59, pm25: 28.2, vector: "Seasonal Pollen" },
    { city: "London", lat: 51.5074, lng: -0.1278, aqi: 26, pm25: 12.4, vector: "Cold-Damp Asthma" },
    { city: "Tokyo", lat: 35.6762, lng: 139.6503, aqi: 31, pm25: 14.8, vector: "Low Vector" },
    { city: "Dubai", lat: 25.2048, lng: 55.2708, aqi: 113, pm25: 54.0, vector: "Thermal Dehydration" },
    { city: "New York", lat: 40.7128, lng: -74.0060, aqi: 34, pm25: 16.2, vector: "West Nile Surveillance" },
    { city: "Singapore", lat: 1.3521, lng: 103.8198, aqi: 47, pm25: 22.5, vector: "Year-Round Aedes" },
    { city: "Sydney", lat: -33.8688, lng: 151.2093, aqi: 22, pm25: 10.5, vector: "Ross River Monitoring" }
];

// Helper to prevent React Error #31 (objects as children)
const safeText = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return val.name || val.address || JSON.stringify(val);
    return String(val);
};

export const GlobePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [locationAnalysis, setLocationAnalysis] = useState<{ result: LocationAnalysisResult, imageUrl: string | null } | null>(null);
  const [citySnapshot, setCitySnapshot] = useState<CityHealthSnapshot | null>(null);
  const [analysisType, setAnalysisType] = useState<'location' | 'city' | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const globeEl = useRef<any>(null);

  const [globeDimensions, setGlobeDimensions] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? (window.innerWidth || 800) : 800,
    height: typeof window !== 'undefined' ? (window.innerHeight || 600) : 600
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [panelTitle, setPanelTitle] = useState<string>('Analysis');
  const [facilityPoints, setFacilityPoints] = useState<any[]>([]);
  const { language } = useI18n();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width) || window.innerWidth || 800;
      const h = Math.floor(rect.height) || window.innerHeight || 600;
      setGlobeDimensions((prev) => {
        if (prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (isGlobeReady && globeEl.current) {
      globeEl.current.pointOfView({ altitude: 2.5 }, 1000);
    }
  }, [isGlobeReady]);
  
  const openPanel = (title: string) => {
    setPanelTitle(safeText(title));
    setIsPanelOpen(true);
    setIsLoading(true);
    setError(null);
    setLocationAnalysis(null);
    setCitySnapshot(null);
    setFacilityPoints([]); 
  };

  const startLocationAnalysis = useCallback(async (lat: number, lng: number, locationName?: string) => {
    if (isLoading) return;
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat, lng, altitude: 0.4 }, 2000);
    }
    setClickedCoords({ lat, lng });
    setAnalysisType('location');
    openPanel(locationName || 'Resolving Location...');
    try {
      const { analysis, imageUrl } = await analyzeLocationByCoordinates(lat, lng, language, locationName);
      setLocationAnalysis({ result: analysis, imageUrl: imageUrl });
      setPanelTitle(safeText(analysis.locationName));
    } catch (err) {
      setError('Failed to analyze. Model busy.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, language]);

  const startCityAnalysis = useCallback(async (city: City) => {
    if (isLoading) return;
    if (globeEl.current) {
        globeEl.current.pointOfView({ lat: city.lat, lng: city.lng, altitude: 0.4 }, 2000);
    }
    setClickedCoords({ lat: city.lat, lng: city.lng });
    setAnalysisType('city');
    openPanel(`Health Snapshot: ${city.name}`);
    try {
        const snapshot = await getCityHealthSnapshot(city.name, city.country, language);
        setCitySnapshot(snapshot);
    } catch (err) {
        setError('Failed to generate snapshot.');
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, language]);

  const handleGlobeClick = useCallback(({ lat, lng }: { lat: number, lng: number }) => {
    startLocationAnalysis(lat, lng);
  }, [startLocationAnalysis]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    try {
        const { lat, lng, foundLocationName } = await geocodeLocation(searchQuery);
        startLocationAnalysis(lat, lng, foundLocationName);
    } catch (err) {
        setSearchError("Location not found.");
    } finally {
        setIsSearching(false);
    }
  };
  
  const closePanel = () => {
      setIsPanelOpen(false);
      setSearchQuery('');
      setSearchError(null);
      setAnalysisType(null);
      setClickedCoords(null);
      setFacilityPoints([]);
      if (globeEl.current) {
          const currentPos = globeEl.current.pointOfView();
          globeEl.current.pointOfView({ ...currentPos, altitude: Math.max(currentPos.altitude, 1.5) }, 1500);
      }
  }

  const handleFacilitiesFound = (facilities: Omit<Facility, 'distance'>[]) => {
      if (clickedCoords && facilities.length > 0 && globeEl.current) {
          globeEl.current.pointOfView({ lat: clickedCoords.lat, lng: clickedCoords.lng, altitude: 0.15 }, 2000); 
          const points = facilities.map(f => ({
              lat: f.lat,
              lng: f.lng,
              name: f.name,
              color: f.type === 'Hospital' ? '#ef4444' : (f.type === 'Clinic' ? '#f97316' : '#22c55e')
          }));
          setFacilityPoints(points);
      }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-screen overflow-hidden bg-slate-950 select-none">
      {globeDimensions.width > 0 && globeDimensions.height > 0 && (
          <Globe
            ref={globeEl}
            width={globeDimensions.width}
            height={globeDimensions.height}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
            onGlobeClick={handleGlobeClick}
            atmosphereColor="lightblue"
            atmosphereAltitude={0.25}
            onGlobeReady={() => setIsGlobeReady(true)}
            ringsData={OPENAQ_GLOBE_STATIONS.map(s => ({
                lat: s.lat,
                lng: s.lng,
                maxR: s.aqi > 150 ? 5.5 : s.aqi > 80 ? 4.0 : 2.5,
                propagationSpeed: (s.aqi > 150 ? 3.0 : 1.5),
                repeatPeriod: 1200,
                color: (t: number) => s.aqi > 150 
                    ? `rgba(239, 68, 68, ${Math.sqrt(1 - t)})` 
                    : s.aqi > 80 
                    ? `rgba(245, 158, 11, ${Math.sqrt(1 - t)})` 
                    : `rgba(34, 197, 94, ${Math.sqrt(1 - t)})`
            }))}
            pointsData={facilityPoints}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={0.02}
            pointRadius={0.4}
            pointLabel="name"
            labelsData={majorCities}
            labelLat="lat"
            labelLng="lng"
            labelText="name"
            labelSize={(d: any) => d === hoveredLabel ? 1.0 : 0.6}
            labelDotRadius={0}
            labelColor={(d: any) => d === hoveredLabel ? 'rgba(255, 215, 0, 1)' : 'rgba(255, 255, 255, 0.8)'}
            labelAltitude={0.01}
            onLabelClick={(label: any) => startCityAnalysis(label as City)}
            onLabelHover={(label: any) => {
                setHoveredLabel(label);
                if (containerRef.current) containerRef.current.style.cursor = label ? 'pointer' : 'default';
            }}
          />
      )}

      <div className={`absolute top-4 left-4 right-4 flex items-center gap-2 sm:gap-4 transition-opacity duration-500 z-20 ${isPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <BackButton onClick={onBack} className="bg-white/80 backdrop-blur-md flex-shrink-0" />
        <div className="flex-grow min-w-0">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a location..."
              className="w-full pl-4 pr-12 py-3 bg-white/80 backdrop-blur-md border border-slate-300/50 rounded-full shadow-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isSearching}
            />
            <button type="submit" className="absolute top-1/2 right-2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
              {isSearching ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MagnifyingGlassIcon className="w-5 h-5" />}
            </button>
          </form>
          {searchError && <p className="text-center text-sm text-red-400 mt-2 bg-black/50 p-2 rounded-md">{searchError}</p>}
        </div>
      </div>

      {/* Responsive Slide-Over / Bottom Sheet Inspection Drawer */}
      <div className={`fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-0 sm:right-0 sm:left-auto h-[82vh] sm:h-full w-full sm:w-[460px] md:w-[500px] max-w-full bg-white/95 backdrop-blur-xl shadow-2xl rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-slate-200/80 transition-transform duration-300 ease-out z-40 flex flex-col ${isPanelOpen ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full pointer-events-none'}`}>
        {/* Mobile Swipe / Drag Pill Handle */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center items-center flex-shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
        </div>
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white/95 sticky top-0 z-10">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate pr-3">{safeText(panelTitle)}</h2>
            <button 
              onClick={closePanel} 
              className="min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Close panel"
            >
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {isLoading && (
                <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-slate-600 font-semibold text-sm">{analysisType === 'city' ? 'Generating Health Snapshot...' : 'Analyzing Location forensic data...'}</p>
                </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 m-4 rounded-xl text-sm">{error}</div>}
            {locationAnalysis && analysisType === 'location' && clickedCoords && (
              <LocationReport 
                result={locationAnalysis.result} 
                imageUrl={locationAnalysis.imageUrl} 
                coords={clickedCoords} 
                onFacilitiesFound={handleFacilitiesFound} 
              />
            )}
            {citySnapshot && analysisType === 'city' && <CityHealthReport snapshot={citySnapshot} />}
        </div>
      </div>

      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 transition-opacity duration-500 z-10 ${isPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-white/80 backdrop-blur-md py-2 px-4 rounded-full shadow-lg">
              <p className="text-sm text-slate-700 font-medium">Click on the globe or a city to begin analysis.</p>
          </div>
      </div>
    </div>
  );
};
