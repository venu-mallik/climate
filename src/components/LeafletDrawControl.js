'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { FeatureGroup, useMap } from 'react-leaflet';

export default function LeafletDrawControl({
  position = 'topright',
  draw,
  edit,
  onCreated,
  onEdited,
  onDeleted,
  onMount
}) {
  const map = useMap();
  const featureGroupRef = useRef(null);

  const handlersRef = useRef({ onCreated, onEdited, onDeleted, onMount });
  handlersRef.current = { onCreated, onEdited, onDeleted, onMount };

  useEffect(() => {
    const featureGroup = featureGroupRef.current;
    if (!featureGroup) return;

    if (handlersRef.current.onMount) handlersRef.current.onMount(featureGroup);

    const control = new L.Control.Draw({
      position,
      draw,
      edit: { ...edit, featureGroup }
    });
    map.addControl(control);

    const handleCreated = (e) => {
      featureGroup.addLayer(e.layer);
      if (handlersRef.current.onCreated) handlersRef.current.onCreated(e);
    };
    const handleEdited = (e) => {
      if (handlersRef.current.onEdited) handlersRef.current.onEdited(e);
    };
    const handleDeleted = (e) => {
      if (handlersRef.current.onDeleted) handlersRef.current.onDeleted(e);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.removeControl(control);
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
    };
  }, [map, position, draw, edit]);

  return <FeatureGroup ref={featureGroupRef} />;
}