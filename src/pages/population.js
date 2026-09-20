'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { Button, Input, InputNumber, Spin, Table, Tag } from 'antd';
import AppLayout from '@/components/AppLayout';

const API_URL = 'https://ringpopulationsapi.azurewebsites.net/api/globalboundarypopulations';

const DRAW_OPTIONS = {
  polyline: false,
  marker: false,
  circlemarker: false,
  circle: false,
  polygon: { shapeOptions: { color: '#2196f3', fillOpacity: 0.15, weight: 1 } },
  rectangle: { shapeOptions: { color: '#e91e63', fillOpacity: 0.15, weight: 1 } }
};

const CIRCLE_SHAPE = { color: '#4caf50', fillOpacity: 0.15, weight: 1 };

const toRad = (d) => (d * Math.PI) / 180;

function ringAreaKm2(ring) {
  const R = 6371.0088;
  if (!ring || ring.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    area += toRad(p2[0] - p1[0]) * (2 + Math.sin(toRad(p1[1])) + Math.sin(toRad(p2[1])));
  }
  return Math.abs((area * R * R) / 2);
}

function geometryAreaKm2(geom) {
  if (!geom) return 0;
  if (geom.type === 'Polygon') {
    let a = ringAreaKm2(geom.coordinates[0]);
    for (let r = 1; r < geom.coordinates.length; r++) a -= ringAreaKm2(geom.coordinates[r]);
    return Math.max(0, Math.abs(a));
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.reduce((sum, poly) => {
      let a = ringAreaKm2(poly[0]);
      for (let r = 1; r < poly.length; r++) a -= ringAreaKm2(poly[r]);
      return sum + Math.abs(a);
    }, 0);
  }
  return 0;
}

const fmt = (n, d = 0) => (n == null ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d }));

const RAMP_STOPS = ['#ffffcc', '#ffeda0', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c'].map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
});

function rampColor(t) {
  const x = Math.max(0, Math.min(1, t)) * (RAMP_STOPS.length - 1);
  const i = Math.min(Math.floor(x), RAMP_STOPS.length - 2);
  const f = x - i;
  const a = RAMP_STOPS[i];
  const b = RAMP_STOPS[i + 1];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return 'rgb(' + c.join(',') + ')';
}

const fmtDensity = (v) => Math.round(v).toLocaleString('en-US');

function makeDensityScale(vals) {
  const ds = vals.filter((v) => v != null && !isNaN(v) && v > 0);
  if (!ds.length) return null;
  let lo = Math.min(...ds);
  let hi = Math.max(...ds);
  if (lo === hi) {
    lo = hi / 2;
    hi = hi * 2;
  }
  if (hi <= 0) {
    lo = 0.5;
    hi = 1;
  }
  const llo = Math.log(lo);
  const lhi = Math.log(hi);
  const bins = 5;
  const b = [];
  for (let i = 0; i < bins; i++) {
    const t0 = i / bins;
    const t1 = (i + 1) / bins;
    const v0 = Math.exp(llo + (lhi - llo) * t0);
    const v1 = Math.exp(llo + (lhi - llo) * t1);
    b.push({ color: rampColor((t0 + t1) / 2), label: fmtDensity(v0) + '–' + fmtDensity(v1) });
  }
  return {
    lo,
    hi,
    bins: b,
    colorFor: (d) => {
      const t = (Math.log(Math.max(d, lo)) - llo) / (lhi - llo);
      return rampColor(t);
    }
  };
}

function applyResultStyle(layer, result, scale) {
  if (!layer || typeof layer.setStyle !== 'function') return;
  let s;
  if (result.error) s = { fillColor: '#dc2626', fillOpacity: 0.45, color: '#b91c1c', weight: 1, dashArray: '4 2' };
  else if (result.pending) s = { fillColor: '#d4d4d8', fillOpacity: 0.4, color: '#71717a', weight: 1, dashArray: '2 2' };
  else if (result.density != null && scale) s = { fillColor: scale.colorFor(result.density), fillOpacity: 0.6, color: '#111827', weight: 1 };
  else s = { fillColor: '#94a3b8', fillOpacity: 0.3, color: '#334155', weight: 1 };
  layer.setStyle(s);
}

const layerToFeature = (layer) => {
  if (layer instanceof window.L.Circle) {
    const center = layer.getLatLng();
    const radius = layer.getRadius();
    const R = 6378137;
    const lat = (center.lat * Math.PI) / 180;
    const lng = (center.lng * Math.PI) / 180;
    const d = radius / R;
    const steps = 96;
    const ring = [];
    for (let i = 0; i <= steps; i++) {
      const brng = (i / steps) * 2 * Math.PI;
      const sinLat = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(brng));
      const lon = lng + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(sinLat));
      ring.push([(lon * 180) / Math.PI, (sinLat * 180) / Math.PI]);
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
  }
  return layer.toGeoJSON();
};

export default function PopulationEstimator() {
  const [zones, setZones] = useState([]);
  const [results, setResults] = useState({});
  const [showTable, setShowTable] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);

  const mapRef = useRef(null);
  const drawnRef = useRef(null);
  const drawnInfoRef = useRef(new Map());
  const zoneCounterRef = useRef(1);
  const handlersRef = useRef(null);
  const legendElRef = useRef(null);
  const circleModeRef = useRef(false);
  const circleBtnRef = useRef(null);
  const radiusKmRef = useRef(10);

  useEffect(() => {
    if (mapRef.current) return;

    const init = () => {
      if (mapRef.current) return;
      if (!window.L || !window.L.Control || !window.L.Control.Draw) {
        setTimeout(init, 250);
        return;
      }

      const map = window.L.map('population-map', {
        center: [20.5937, 78.9629],
        zoom: 4
      });

      const satellite = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      });
      const topo = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
        maxZoom: 19
      });
      const transport = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, HERE, MapmyIndia, &copy; OpenStreetMap contributors, and the GIS user community',
        maxZoom: 19
      });
      const terrain = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; USGS, NOAA',
        maxZoom: 19
      });

      const labels = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Labels &copy; Esri',
        maxZoom: 19
      });
      const referenceOverlay = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Reference &copy; Esri',
        maxZoom: 19
      });
      const transportOverlay = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Transport &copy; Esri',
        maxZoom: 19
      });
      const hillshade = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Elevation &copy; Esri',
        maxZoom: 19
      });

      satellite.addTo(map);
      labels.addTo(map);

      window.L.control.layers(
        {
          'Satellite': satellite,
          'Topo': topo,
          'Transport': transport,
          'Terrain': terrain
        },
        {
          'Labels': labels,
          'Reference': referenceOverlay,
          'Transport overlay': transportOverlay,
          'Hillshade': hillshade
        },
        { position: 'topleft', collapsed: true }
      ).addTo(map);

      const drawn = new window.L.FeatureGroup();
      map.addLayer(drawn);
      drawnRef.current = drawn;

      const drawControl = new window.L.Control.Draw({
        position: 'topright',
        draw: DRAW_OPTIONS,
        edit: { featureGroup: drawn, remove: true }
      });
      map.addControl(drawControl);

      const legendEl = document.createElement('div');
      legendEl.className = 'density-legend';
      legendEl.style.display = 'none';
      legendElRef.current = legendEl;
      const legendControl = window.L.control({ position: 'bottomright' });
      legendControl.onAdd = () => legendEl;
      legendControl.addTo(map);

      const circleBtn = document.createElement('button');
      circleBtn.type = 'button';
      circleBtn.className = 'circle-gate';
      circleBtn.title = 'Circle gate: tap/click places a circle of the header radius';
      circleBtn.innerHTML = '○';
      circleBtnRef.current = circleBtn;
      const setCircleMode = (on) => {
        circleModeRef.current = on;
        circleBtn.classList.toggle('circle-gate-on', on);
        map.getContainer().style.cursor = on ? 'crosshair' : '';
      };
      setCircleMode(false);
      circleBtn.onclick = (ev) => {
        window.L.DomEvent.stopPropagation(ev);
        setCircleMode(!circleModeRef.current);
      };
      const circleControl = window.L.control({ position: 'topright' });
      circleControl.onAdd = () => {
        const wrap = document.createElement('div');
        wrap.className = 'leaflet-control circle-gate-wrap';
        wrap.appendChild(circleBtn);
        return wrap;
      };
      circleControl.addTo(map);

      map.on(window.L.Draw.Event.DRAWSTART, () => setCircleMode(false));

      map.on('click', (e) => {
        if (!circleModeRef.current) return;
        const r = Number(radiusKmRef.current);
        if (!r || r <= 0) return;
        const circle = window.L.circle(e.latlng, { ...CIRCLE_SHAPE, radius: r * 1000 }).addTo(drawn);
        handlersRef.current.handleCreated({ layer: circle });
      });

      map.on(window.L.Draw.Event.CREATED, (e) => {
        drawn.addLayer(e.layer);
        handlersRef.current.handleCreated(e);
      });
      map.on(window.L.Draw.Event.EDITED, (e) => handlersRef.current.handleEdited(e));
      map.on(window.L.Draw.Event.DELETED, (e) => handlersRef.current.handleDeleted(e));

      mapRef.current = map;
    };

    setTimeout(init, 250);
  }, []);

  const refreshZones = () => {
    const layers = (drawnRef.current ? drawnRef.current.getLayers() : []).filter((l) => typeof l.toGeoJSON === 'function');
    const list = layers.map((layer) => {
      const id = window.L.stamp(layer);
      const info = drawnInfoRef.current.get(id);
      let areaKm2 = 0;
      try {
        areaKm2 = geometryAreaKm2(layerToFeature(layer).geometry);
      } catch (e) {
        // still in the middle of drawing - keep previous area
      }
      return { id, name: info && info.name ? info.name : 'Zone ' + id, areaKm2 };
    });
    setZones(list);
  };

  const handleCreated = (e) => {
    const layer = e.layer;
    const id = window.L.stamp(layer);
    drawnInfoRef.current.set(id, { name: 'Zone ' + zoneCounterRef.current });
    zoneCounterRef.current += 1;
    setShowTable(true);
    refreshZones();
    runRow(layer);
  };

  const handleEdited = (e) => {
    e.layers.eachLayer((layer) => runRow(layer));
    refreshZones();
  };

  const handleDeleted = (e) => {
    const removed = [];
    e.layers.eachLayer((layer) => {
      const id = window.L.stamp(layer);
      removed.push(id);
      drawnInfoRef.current.delete(id);
    });
    setResults((prev) => {
      const next = { ...prev };
      removed.forEach((id) => delete next[id]);
      return next;
    });
    refreshZones();
  };

  handlersRef.current = { handleCreated, handleEdited, handleDeleted };

  useEffect(() => {
    radiusKmRef.current = radiusKm;
  }, [radiusKm]);

  useEffect(() => {
    const drawn = drawnRef.current;
    if (!drawn) return;
    const layers = drawn.getLayers().filter((l) => typeof l.toGeoJSON === 'function');
    const vals = layers.map((l) => (results[window.L.stamp(l)] || {}).density).filter((v) => v != null);
    const scale = makeDensityScale(vals);
    layers.forEach((layer) => {
      const id = window.L.stamp(layer);
      applyResultStyle(layer, results[id] || {}, scale);
    });
    const el = legendElRef.current;
    if (!el) return;
    if (!scale) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.innerHTML =
      '<div class="dl-title">Density (p/km²)</div>' +
      scale.bins.map((b) => '<div class="dl-row"><span class="dl-swatch" style="background:' + b.color + '"></span><span>' + b.label + '</span></div>').join('');
  }, [zones, results]);

  const renameZone = (id, name) => {
    const info = drawnInfoRef.current.get(id);
    if (info) info.name = name;
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, name } : z)));
  };

  const removeZone = (id) => {
    const layers = (drawnRef.current ? drawnRef.current.getLayers() : []).filter((l) => typeof l.toGeoJSON === 'function');
    const layer = layers.find((l) => window.L.stamp(l) === id);
    if (layer && drawnRef.current) drawnRef.current.removeLayer(layer);
    drawnInfoRef.current.delete(id);
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setZones((zs) => zs.filter((z) => z.id !== id));
  };

  const clearAll = () => {
    if (drawnRef.current) drawnRef.current.clearLayers();
    drawnInfoRef.current.clear();
    zoneCounterRef.current = 1;
    setZones([]);
    setResults({});
  };

  const runRow = async (layer) => {
    const id = window.L.stamp(layer);
    const feature = layerToFeature(layer);
    const areaKm2 = geometryAreaKm2(feature.geometry);

    setResults((prev) => ({ ...prev, [id]: { areaKm2, pending: true } }));

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ type: 'FeatureCollection', features: [feature] }),
        headers: { 'Content-type': 'application/json; charset=UTF-8' }
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      const d = (json && json[0]) || {};
      const people = d.people != null ? Number(d.people) : null;
      setResults((prev) => ({
        ...prev,
        [id]: {
          people,
          busStops: d.busStops != null ? Number(d.busStops) : null,
          tramStops: d.tramStops != null ? Number(d.tramStops) : null,
          railStops: d.railStops != null ? Number(d.railStops) : null,
          areaKm2,
          density: areaKm2 > 0 && people != null ? people / areaKm2 : null,
          pending: false
        }
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [id]: { areaKm2, error: err.message, pending: false }
      }));
    }
  };

  const summary = () => {
    const vals = zones.map((z) => results[z.id]).filter(Boolean);
    const totPop = vals.reduce((s, r) => s + (r.people || 0), 0);
    const totArea = zones.reduce((s, z) => s + (z.areaKm2 || 0), 0);
    const totBus = vals.reduce((s, r) => s + (r.busStops || 0), 0);
    const totTram = vals.reduce((s, r) => s + (r.tramStops || 0), 0);
    const totRail = vals.reduce((s, r) => s + (r.railStops || 0), 0);
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={2} align="right"><strong>{fmt(totArea, 1)}</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={3} align="right"><strong>{fmt(totPop)}</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={4} align="right"><strong>{totArea > 0 ? fmt(totPop / totArea) : '–'}</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right"><strong>{fmt(totBus)}</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right"><strong>{fmt(totTram)}</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right"><strong>{fmt(totRail)}</strong></Table.Summary.Cell>
        <Table.Summary.Cell index={8} />
      </Table.Summary.Row>
    );
  };

  const columns = [
    {
      title: '#',
      width: 32,
      render: (_, __, i) => i + 1
    },
    {
      title: 'Name',
      width: 120,
      render: (_, rec) => (
        <Input size="small" value={rec.name} onChange={(e) => renameZone(rec.id, e.target.value)} />
      )
    },
    {
      title: 'Area (km²)',
      align: 'right',
      width: 80,
      render: (_, rec) => fmt(rec.areaKm2, 1)
    },
    {
      title: 'Population',
      align: 'right',
      width: 90,
      render: (_, rec) => {
        const r = results[rec.id];
        if (r && r.pending) return <Spin size="small" />;
        return fmt(r && r.people);
      }
    },
    {
      title: 'Density (p/km²)',
      align: 'right',
      width: 92,
      render: (_, rec) => fmt(results[rec.id] && results[rec.id].density)
    },
    {
      title: 'Bus',
      align: 'right',
      width: 48,
      render: (_, rec) => fmt(results[rec.id] && results[rec.id].busStops)
    },
    {
      title: 'Tram',
      align: 'right',
      width: 48,
      render: (_, rec) => fmt(results[rec.id] && results[rec.id].tramStops)
    },
    {
      title: 'Rail',
      align: 'right',
      width: 48,
      render: (_, rec) => fmt(results[rec.id] && results[rec.id].railStops)
    },
    {
      title: 'Error',
      align: 'center',
      width: 48,
      render: (_, rec) =>
        results[rec.id] && results[rec.id].error ? <Tag color="red">fail</Tag> : null
    },
    {
      title: '',
      width: 36,
      render: (_, rec) => (
        <Button size="small" type="text" danger onClick={() => removeZone(rec.id)} aria-label={'Remove ' + rec.name}>
          ✕
        </Button>
      )
    }
  ];

  return (
    <AppLayout title="Population Estimator" fullscreen>
      <Head >
        <title>Population Estimator</title>
        <style>{`
          #population-map .leaflet-control a { text-decoration: none; }
          #zones-table .ant-table { font-size: 12px; }
          #zones-table .ant-table-thead > tr > th { font-size: 11px; font-weight: 600; color: #666; padding: 4px 8px; white-space: nowrap; }
          #zones-table .ant-table-tbody > tr > td { padding: 3px 8px; }
          #zones-table .ant-table-tbody > tr > td:last-child,
          #zones-table .ant-table-thead > tr > th:last-child { text-align: center; }
          #zones-table .ant-input-sm { font-size: 12px; padding: 1px 6px; }
          .density-legend { background: rgba(255,255,255,0.95); border-radius: 6px; padding: 6px 8px; font: 11px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; box-shadow: 0 1px 5px rgba(0,0,0,0.3); pointer-events: auto; }
          .density-legend .dl-title { font-weight: 600; margin-bottom: 4px; }
          .density-legend .dl-row { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
          .density-legend .dl-swatch { width: 18px; height: 10px; border: 1px solid rgba(0,0,0,0.15); display: inline-block; }
          .circle-gate-wrap { margin-top: 4px; }
          .circle-gate { display: block; width: 30px; height: 30px; padding: 0; background: #fff; border: 1px solid rgba(0,0,0,0.2); border-radius: 2px; cursor: pointer; font-size: 16px; line-height: 28px; text-align: center; color: #333; }
          .circle-gate:hover { background: #f4f4f4; }
          .circle-gate.circle-gate-on { background: #3498db; color: #fff; border-color: #1a5276; }
          @media (max-width: 640px) {
            #zones-table .ant-table-thead > tr > th { font-size: 10px; padding: 4px 6px; }
            #zones-table .ant-table-tbody > tr > td { padding: 3px 6px; }
          }
        `}</style>
      </Head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" />
      <script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js" />

      <div style={{ height: '95%', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ background: '#1b3a5b', padding: '3px 10px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 13, lineHeight: 1.2, fontWeight: 600 }}>Population Estimator</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#cfe3ff' }}>Circle km</span>
            <InputNumber size="small" min={0.1} max={500} value={radiusKm} onChange={(v) => setRadiusKm(v ?? 10)} style={{ width: 90 }} />
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{zones.length} zone(s)</Tag>
            <Button size="small" onClick={clearAll} disabled={!zones.length}>
              Clear all
            </Button>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div id="population-map" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

{showTable ? (
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1000, background: 'rgba(255,255,255,0.97)', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.25)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid #ececec' }}>
                <strong style={{ fontSize: 12 }}>Zones</strong>
                <Tag color="blue" style={{ fontSize: 11, lineHeight: '16px', margin: 0 }}>{zones.length}</Tag>
                <Button size="small" type="text" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => setShowTable(false)} aria-label="Hide zones table">✕</Button>
              </div>
              <div id="zones-table" style={{ maxHeight: '38vh', minHeight: zones.length ? 60 : 120, overflow: 'auto' }}>
                <Table
                  size="small"
                  rowKey="id"
                  columns={columns}
                  dataSource={zones}
                  pagination={false}
                  summary={summary}
                  scroll={{ x: 'max-content' }}
                  locale={{
                    emptyText: 'No zones yet. Press the ○ button (top-right, above the draw toolbar) to arm circle mode, then tap/click the map to drop a circle with the header radius. Or use the polygon / rectangle tools — population loads for each zone automatically.'
                  }}
                />
              </div>
              <p style={{ margin: 0, padding: '6px 10px', fontSize: 11, color: '#888', borderTop: '1px solid #ececec' }}>
                One API call is made per zone. Population estimate uses the GHSL 2025 grid via the Open Innovations population API.
                Areas that overlap will be counted twice.
              </p>
            </div>
          ) : (
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
              <Button size="small" type="primary" ghost onClick={() => setShowTable(true)}>
                Zones table ({zones.length})
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}