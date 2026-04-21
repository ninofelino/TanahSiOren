'use client';

import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick: (coordinates: { lat: number; lng: number }) => void;
  onMapDblClick: (coordinates: { lat: number; lng: number }) => void;
  onZoomChange: (zoom: number) => void;
  isActive: boolean;
}

export default function MapClickHandler({ onMapClick, onMapDblClick, onZoomChange, isActive }: MapClickHandlerProps) {
  const map = useMapEvents({
    click: (e) => {
      if (isActive) {
        onMapClick(e.latlng);
      }
    },
    dblclick: (e) => {
      if (isActive) {
        onMapDblClick(e.latlng);
      }
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  return null;
}
