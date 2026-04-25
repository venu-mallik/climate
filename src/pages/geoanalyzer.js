'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export default function GeoAnalyzerPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ area: 0, population: 0, roads: 0, buildings: 0 });
  
  const mapRef = useRef(null);
  const drawnRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = () => {
      if (!window.L || mapRef.current) return;
      
      const map = window.L.map('geo-map', {
        center: [20.5937, 78.9629],
        zoom: 8
      });

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: 'OSM'
      }).addTo(map);

      const drawn = new window.L.FeatureGroup();
      map.addLayer(drawn);
      drawnRef.current = drawn;

      if (window.L.Control && window.L.Control.Draw) {
        const drawControl = new window.L.Control.Draw({
          position: 'topright',
          draw: {
            polyline: false,
            circlemarker: false,
            marker: false,
            polygon: { shapeOptions: { color: '#3388ff', fillOpacity: 0.2, weight: 2 } },
            circle: { shapeOptions: { color: '#3388ff', fillOpacity: 0.2, weight: 2 } },
            rectangle: { shapeOptions: { color: '#3388ff', fillOpacity: 0.2, weight: 2 } }
          },
          edit: { featureGroup: drawn, remove: true }
        });
        map.addControl(drawControl);
      }

      map.on('draw:created', async (e) => {
        const geojson = e.layer.toGeoJSON();
        const coords = geojson.geometry?.coordinates?.[0] || [];
        const areaKm2 = calcPolygonArea(coords);
        await fetchAllData(areaKm2, coords);
      });

      mapRef.current = map;
    };

    setTimeout(init, 500);
  }, []);

  // Calculate polygon area using Shoelace formula (for small areas) + geodesic correction
  const calcPolygonArea = (coords) => {
    if (!coords || coords.length < 3) return 0;
    
    // Shoelace formula for geographic coordinates (approximate for small areas)
    let area = 0;
    const n = coords.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[j];
      
      // Convert to radians
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      const lngDiff = (lng2 - lng1) * Math.PI / 180;
      
      // Shoelace with latitude correction
      area += lngDiff * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
    }
    
    area = Math.abs(area * 6371 * 6371 / 2);
    
    return area; // in km²
  };

  // Alternative: simple bounding box area (more reliable)
  const calcSimpleArea = (coords) => {
    if (!coords || coords.length < 3) return 0;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    for (const [lng, lat] of coords) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    
    // Convert to km (rough approximation at ~20° latitude)
    const latKm = (maxLat - minLat) * 111;
    const lngKm = (maxLng - minLng) * 111 * Math.cos(20 * Math.PI / 180);
    
    // Return ~60% of bounding box (realistic for irregular shapes)
    return latKm * lngKm * 0.6;
  };

  const getBounds = (coords) => {
    if (!coords?.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [lng, lat] of coords) {
      minX = Math.min(minX, lng);
      minY = Math.min(minY, lat);
      maxX = Math.max(maxX, lng);
      maxY = Math.max(maxY, lat);
    }
    return minX === Infinity ? null : { south: minY, west: minX, north: maxY, east: maxX };
  };

  const fetchAllData = async (areaKm2, coords) => {
    setLoading(true);
    setError(null);

    try {
      const bounds = getBounds(coords);
      if (!bounds) return;

      // Population: use area-based estimation (density ~450/km² for India)
      const population = Math.round(areaKm2 * 450);

      // Roads from Overpass API
      let roads = 0;
      try {
        const roadQuery = `[out:json][timeout:30];(way["highway"](${bounds.south},${bounds.west},${bounds.north},${bounds.east}););out body;`;
        const roadRes = await fetch(OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(roadQuery) });
        const roadData = await roadRes.json();
        
        const nodes = new Map();
        for (const el of roadData.elements || []) {
          if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
        }
        
        for (const el of roadData.elements || []) {
          if (el.type === 'way' && el.nodes) {
            for (let i = 0; i < el.nodes.length - 1; i++) {
              const n1 = nodes.get(el.nodes[i]);
              const n2 = nodes.get(el.nodes[i + 1]);
              if (n1 && n2) {
                // Haversine distance
                const R = 6371;
                const dLat = (n2[1] - n1[1]) * Math.PI / 180;
                const dLng = (n2[0] - n1[0]) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(n1[1]*Math.PI/180) * Math.cos(n2[1]*Math.PI/180) * Math.sin(dLng/2)**2;
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                roads += R * c;
              }
            }
          }
        }
      } catch (e) {
        console.error('Roads error:', e);
      }

      // Buildings count from Overpass
      let buildings = 0;
      try {
        const bldQuery = `[out:json][timeout:30];(way["building"](${bounds.south},${bounds.west},${bounds.north},${bounds.east}););out count;`;
        const bldRes = await fetch(OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(bldQuery) });
        const bldData = await bldRes.json();
        buildings = bldData.elements?.[0]?.tags?.total || 0;
      } catch (e) {
        console.error('Buildings error:', e);
      }

      const newZones = [...zones, { area: areaKm2, population, roads, buildings }];
      setZones(newZones);

      setStats({
        area: newZones.reduce((a, z) => a + z.area, 0),
        population: newZones.reduce((a, z) => a + z.population, 0),
        roads: newZones.reduce((a, z) => a + z.roads, 0),
        buildings: newZones.reduce((a, z) => a + z.buildings, 0)
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (drawnRef.current) drawnRef.current.clearLayers();
    setZones([]);
    setStats({ area: 0, population: 0, roads: 0, buildings: 0 });
  };

  const formatNum = (n) => {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000) return (n / 100000).toFixed(1) + ' L';
    if (n >= 1000) return (n / 1000).toFixed(1) + ' K';
    return n.toString();
  };

  return (
    <>
      <Head>
        <title>GeoAnalyzer</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
      </Head>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>

      <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1001, background: '#1e3a5f', padding: '10px 20px', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: 16 }}>GeoAnalyzer</h1>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>Draw zones - Get real GIS data</p>
        </div>

        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'white', padding: '12px 16px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minWidth: 180 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Statistics</div>
          {loading ? (
            <div style={{ color: '#888' }}>Fetching API...</div>
          ) : (
            <>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#888' }}>Area: </span><strong>{stats.area.toFixed(2)} km²</strong></div>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#888' }}>Population: </span><strong>{formatNum(stats.population)}</strong></div>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#888' }}>Roads: </span><strong>{stats.roads.toFixed(1)} km</strong></div>
              <div><span style={{ color: '#888' }}>Buildings: </span><strong>{stats.buildings.toLocaleString()}</strong></div>
            </>
          )}
          {error && <div style={{ color: 'red', fontSize: 10, marginTop: 4 }}>{error}</div>}
          {zones.length > 0 && (
            <button onClick={handleClear} style={{ marginTop: 10, padding: '6px 10px', background: '#fee', border: '1px solid #fdd', borderRadius: 4, cursor: 'pointer', color: '#c00', fontSize: 11 }}>
              Clear
            </button>
          )}
        </div>

        <div id="geo-map" style={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0 }} />
        
        <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: 4, fontSize: 12 }}>
          Zones: {zones.length}
        </div>
      </div>
    </>
  );
}