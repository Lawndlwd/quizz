import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

// Wikimedia's "osm-intl" raster layer prefers English / romanised place names.
const TILE_URL = 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Wikimedia';

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

/** Emoji pin as a Leaflet divIcon (avoids bundling default marker image assets). */
function pin(emoji: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="font-size:26px;line-height:1">${emoji}</div>`,
    className: 'geo-pin',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

/** Look up a place name → coordinates (English-preferring). */
async function geocode(query: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&q=${encodeURIComponent(
    query,
  )}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (Array.isArray(data) && data[0]) {
      return { lat: Number.parseFloat(data[0].lat), lng: Number.parseFloat(data[0].lon) };
    }
  } catch {
    /* network / parse error → treated as not found */
  }
  return null;
}

/**
 * Interactive map — click to drop / move a single pin. When `searchable`, a
 * place-name search box (editor only) flies to and pins a location; players
 * never get search so the answer isn't given away.
 */
export function MapPicker({
  value,
  onChange,
  height = 320,
  searchable = false,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number | string;
  searchable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Initial view only — later pin moves must not recenter or rebuild the map.
  const initialValueRef = useRef(value);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

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
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
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
      else markerRef.current = L.marker([value.lat, value.lng], { icon: pin('📍') }).addTo(map);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value]);

  async function runSearch() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setNotFound(false);
    const hit = await geocode(q);
    setSearching(false);
    if (hit) {
      mapRef.current?.flyTo([hit.lat, hit.lng], 6, { duration: 0.8 });
      onChangeRef.current(hit);
    } else {
      setNotFound(true);
    }
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border"
      style={{ height }}
    >
      {searchable && (
        <div className="absolute left-2 top-2 z-[1000] flex items-center gap-1">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNotFound(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search a place…"
            className="w-44 rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-sm shadow outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className="rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-sm font-medium shadow hover:brightness-110 disabled:opacity-60"
          >
            {searching ? '…' : '🔍'}
          </button>
          {notFound && (
            <span className="rounded bg-background/95 px-2 py-1 text-xs text-destructive shadow">
              Not found
            </span>
          )}
        </div>
      )}
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

/** Static reveal map — correct spot (✅), the player's pin (📍) and a link line. */
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
    L.marker([correct.lat, correct.lng], { icon: pin('✅') }).addTo(map);
    if (guess) {
      L.marker([guess.lat, guess.lng], { icon: pin('📍') }).addTo(map);
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
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
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
