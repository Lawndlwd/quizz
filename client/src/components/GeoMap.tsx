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

const PIN_GUESS = '#273918';
const PIN_CORRECT = '#22c55e';

/** One player's pin on the reveal map. */
export interface MapGuess {
  playerId: number;
  username: string;
  avatar?: string;
  point: LatLng;
  distanceKm?: number | null;
  isMine?: boolean;
}

// Beyond this, permanent name labels bury the map: names move to a hover/tap tooltip.
const MAX_NAME_LABELS = 12;

function guessLabel(guess: MapGuess): HTMLElement {
  const label = document.createElement('div');
  label.className = 'geo-guess-label';
  const name = document.createElement('span');
  name.className = 'geo-guess-name';
  name.textContent = guess.username;
  label.append(name);
  if (guess.distanceKm != null) {
    const distance = document.createElement('span');
    distance.className = 'geo-guess-distance';
    distance.textContent = `${Math.round(guess.distanceKm).toLocaleString()} km`;
    label.append(distance);
  }
  return label;
}

/**
 * A player's avatar pin. Built from DOM nodes, not an HTML string: names and
 * avatars are player-supplied, and divIcon/tooltip strings are rendered as HTML.
 */
function guessIcon(guess: MapGuess, showLabel: boolean): L.DivIcon {
  const root = document.createElement('div');
  root.className = guess.isMine ? 'geo-guess mine' : 'geo-guess';
  if (showLabel) root.append(guessLabel(guess));

  const face = document.createElement('div');
  face.className = 'geo-guess-face';
  const avatar = guess.avatar;
  if (avatar?.startsWith('data:') || avatar?.startsWith('/avatars/')) {
    const img = document.createElement('img');
    img.src = avatar;
    img.alt = '';
    face.append(img);
  } else {
    face.textContent = avatar || '🎮';
  }
  root.append(face);

  return L.divIcon({
    html: root,
    className: 'geo-guess-icon',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    tooltipAnchor: [0, -44],
  });
}

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

/**
 * Static reveal map — the correct spot (green pin) plus either every player's avatar
 * pin (`guesses`) or just one guess (`guess`), each linked to the correct spot.
 * Keep `guesses` referentially stable: a new array rebuilds the map.
 */
export function MapReveal({
  correct,
  guess,
  guesses,
  height = 300,
}: {
  correct: LatLng;
  guess?: LatLng | null;
  guesses?: MapGuess[];
  height?: number | string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // Further out than the picker, so guesses across the globe still fit on a phone.
    const map = L.map(ref.current, { ...MAP_OPTS, minZoom: 0 });
    addTiles(map);
    L.marker([correct.lat, correct.lng], {
      icon: pin(PIN_CORRECT),
      zIndexOffset: 2000,
    }).addTo(map);

    const points: L.LatLngTuple[] = [[correct.lat, correct.lng]];
    const link = (from: LatLng, opacity: number) => {
      L.polyline(
        [
          [from.lat, from.lng],
          [correct.lat, correct.lng],
        ],
        { color: '#f59e0b', weight: 2, dashArray: '6 6', opacity },
      ).addTo(map);
      points.push([from.lat, from.lng]);
    };

    if (guesses?.length) {
      const showLabels = guesses.length <= MAX_NAME_LABELS;
      for (const g of guesses) {
        link(g.point, g.isMine ? 1 : 0.5);
        const marker = L.marker([g.point.lat, g.point.lng], {
          icon: guessIcon(g, showLabels || !!g.isMine),
          riseOnHover: true,
          zIndexOffset: g.isMine ? 1000 : 0,
        }).addTo(map);
        if (!showLabels && !g.isMine) marker.bindTooltip(guessLabel(g), { direction: 'top' });
      }
    } else if (guess) {
      L.marker([guess.lat, guess.lng], { icon: pin(PIN_GUESS) }).addTo(map);
      link(guess, 1);
    }

    if (points.length > 1) {
      // Pins and labels hang above their point, so the top needs the most room.
      const side = Math.min(70, ref.current.clientWidth * 0.1);
      map.fitBounds(points, {
        paddingTopLeft: [side, 90],
        paddingBottomRight: [side, 30],
        maxZoom: 6,
      });
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
  }, [correct, guess, guesses]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full overflow-hidden rounded-lg border border-border"
    />
  );
}
