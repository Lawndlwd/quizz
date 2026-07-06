import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

// Esri World Street Map — free, no API key, and labels places/countries in
// English worldwide (raw OSM tiles use each country's local script). Note the
// {z}/{y}/{x} order (ArcGIS convention), not {z}/{x}/{y}.
const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTR = 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ, and contributors';

const MAP_OPTS: L.MapOptions = {
  worldCopyJump: true,
  minZoom: 2,
  // Crisp integer zoom (Leaflet defaults). One scroll ≈ one level.
  scrollWheelZoom: true,
  zoomSnap: 1,
  zoomDelta: 1,
  wheelPxPerZoomLevel: 100,
  inertia: true,
};

function addTiles(map: L.Map): void {
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);
}

// lucide `map-pin` glyph, inlined so the Leaflet divIcon needs no image assets.
const MAP_PIN_PATH =
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>';

/** A color-coded lucide map pin as a Leaflet divIcon (violet = guess, green = correct). */
function pin(color: string): L.DivIcon {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">${MAP_PIN_PATH}</svg>`,
    className: 'geo-pin',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

const PIN_GUESS = '#7c3aed';
const PIN_CORRECT = '#22c55e';

/**
 * Interactive map — click to drop / move a single pin.
 */
export function MapPicker({
  value,
  onChange,
  height = 320,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number | string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Initial view only — later pin moves must not recenter or rebuild the map.
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const initial = initialValueRef.current;
    const map = L.map(ref.current, MAP_OPTS).setView(
      initial ? [initial.lat, initial.lng] : [20, 0],
      initial ? 4 : 2,
    );
    addTiles(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value) {
      if (markerRef.current) markerRef.current.setLatLng([value.lat, value.lng]);
      else
        markerRef.current = L.marker([value.lat, value.lng], { icon: pin(PIN_GUESS) }).addTo(map);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border"
      style={{ height }}
    >
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

/** Static reveal map — correct spot (green pin), the player's guess (violet pin) and a link line. */
export function MapReveal({
  correct,
  guess,
  height = 300,
}: {
  correct: LatLng;
  guess?: LatLng | null;
  height?: number | string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, MAP_OPTS);
    addTiles(map);
    L.marker([correct.lat, correct.lng], { icon: pin(PIN_CORRECT) }).addTo(map);
    if (guess) {
      L.marker([guess.lat, guess.lng], { icon: pin(PIN_GUESS) }).addTo(map);
      L.polyline(
        [
          [guess.lat, guess.lng],
          [correct.lat, correct.lng],
        ],
        { color: '#f59e0b', weight: 2, dashArray: '6 6' },
      ).addTo(map);
      map.fitBounds(
        [
          [guess.lat, guess.lng],
          [correct.lat, correct.lng],
        ],
        { padding: [40, 40], maxZoom: 6 },
      );
    } else {
      map.setView([correct.lat, correct.lng], 4);
    }
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, [correct, guess]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full overflow-hidden rounded-lg border border-border"
    />
  );
}
