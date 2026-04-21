'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polygon),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Helper component for map clicks
const MapClickHandler = dynamic(
  () => import('./MapClickHandler'),
  { ssr: false }
);

interface House {
  type: string;
  properties: {
    name: string;
    description: string;
    imageUrl: string;
  };
  geometry: {
    type: string;
    coordinates: number[];
  };
}

interface Parcel {
  id: string;
  name: string;
  points: [number, number][]; // [lat, lng]
  color: string;
  area: number; // in m2
  status: 'tersedia' | 'terjual';
}

export default function Home() {
  const [houses, setHouses] = useState<House[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([
    {
      id: 'block-a1',
      name: 'Blok A-01',
      points: [
        [-6.6070, 106.7790], 
        [-6.6070, 106.7795], 
        [-6.6073, 106.7795], 
        [-6.6073, 106.7790]
      ],
      color: '#22c55e',
      area: 1845.50,
      status: 'tersedia'
    },
    {
      id: 'block-a2',
      name: 'Blok A-02 (Berhimpit)',
      points: [
        [-6.6070, 106.7795], 
        [-6.6070, 106.7800], 
        [-6.6073, 106.7800], 
        [-6.6073, 106.7795]
      ],
      color: '#ef4444',
      area: 1845.50,
      status: 'terjual'
    },
    {
      id: 'block-b1',
      name: 'Blok B-01 (Berhimpit)',
      points: [
        [-6.6073, 106.7790], 
        [-6.6073, 106.7795], 
        [-6.6076, 106.7795], 
        [-6.6076, 106.7790]
      ],
      color: '#22c55e',
      area: 1845.40,
      status: 'tersedia'
    },
    {
      id: 'irregular-c',
      name: 'Kavling Kontur Sudut',
      points: [
        [-6.6076, 106.7790], 
        [-6.6076, 106.7795], 
        [-6.6079, 106.7798], 
        [-6.6082, 106.7794], 
        [-6.6080, 106.7788]
      ],
      color: '#22c55e',
      area: 3240.75,
      status: 'tersedia'
    }
  ]);
  
  // UI State
  const [mode, setMode] = useState<'none' | 'adding-house' | 'drawing-parcel'>('none');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [showBaseMap, setShowBaseMap] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editingParcelId, setEditingParcelId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(13);
  
  // House Form State
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseDescription, setNewHouseDescription] = useState('');
  const [newHouseImageUrl, setNewHouseImageUrl] = useState('');
  
  // Parcel Form/Drawing State
  const [currentParcelPoints, setCurrentParcelPoints] = useState<[number, number][]>([]);
  const [newParcelName, setNewParcelName] = useState('');
  const [newParcelStatus, setNewParcelStatus] = useState<'tersedia' | 'terjual'>('tersedia');
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.6075, 106.7793]);
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      const L = leaflet.default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      });
      setL(L);
    });

    import('../data/bogorHouses.json').then((data) => {
      setHouses(data.default.features);
    });
  }, []);

  const calculateArea = (points: [number, number][]) => {
    if (points.length < 3) return 0;
    // Turf expects coordinates as [lng, lat]
    const turfPoints = [...points, points[0]].map(p => [p[1], p[0]]);
    const polygon = turf.polygon([turfPoints]);
    return turf.area(polygon);
  };

  const handleMapClick = (coordinates: { lat: number; lng: number }) => {
    if (mode === 'adding-house') {
      setMapCenter([coordinates.lat, coordinates.lng]);
    } else if (mode === 'drawing-parcel') {
      setCurrentParcelPoints([...currentParcelPoints, [coordinates.lat, coordinates.lng]]);
    }
  };

  const handleSaveParcel = useCallback(() => {
    if (!newParcelName) {
      alert('Mohon beri nama kavling.');
      return;
    }
    if (currentParcelPoints.length < 3) {
      alert('Kavling minimal harus memiliki 3 titik.');
      return;
    }

    const area = calculateArea(currentParcelPoints);
    const color = newParcelStatus === 'tersedia' ? '#22c55e' : '#ef4444';
    
    const newParcel: Parcel = {
      id: Date.now().toString(),
      name: newParcelName,
      points: currentParcelPoints,
      color: color,
      area: area,
      status: newParcelStatus
    };
    
    setParcels(prev => [...prev, newParcel]);
    setCurrentParcelPoints([]);
    setNewParcelName('');
    setNewParcelStatus('tersedia');
    setMode('none');
  }, [newParcelName, currentParcelPoints, newParcelStatus]);

  const toggleParcelStatus = (id: string) => {
    setParcels(parcels.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'tersedia' ? 'terjual' : 'tersedia';
        return {
          ...p,
          status: nextStatus,
          color: nextStatus === 'tersedia' ? '#22c55e' : '#ef4444'
        };
      }
      return p;
    }));
  };

  const handleMapDblClick = (coordinates: { lat: number; lng: number }) => {
    if (mode === 'drawing-parcel' && currentParcelPoints.length >= 3) {
      handleSaveParcel();
    }
  };

  const handleAddHouse = () => {
    if (newHouseName && newHouseDescription && newHouseImageUrl && mapCenter) {
      const newHouse: House = {
        type: 'Feature',
        properties: {
          name: newHouseName,
          description: newHouseDescription,
          imageUrl: newHouseImageUrl,
        },
        geometry: {
          type: 'Point',
          coordinates: [mapCenter[1], mapCenter[0]],
        },
      };
      setHouses([...houses, newHouse]);
      setNewHouseName('');
      setNewHouseDescription('');
      setNewHouseImageUrl('');
      setMode('none');
    } else {
      alert('Mohon lengkapi semua detail rumah dan pilih lokasi di peta.');
    }
  };

  const deleteParcel = (id: string) => {
    setParcels(parcels.filter(p => p.id !== id));
    if (editingParcelId === id) setEditingParcelId(null);
  };

  const updateParcelPoint = (parcelId: string, pointIndex: number, newLatLng: { lat: number, lng: number }) => {
    setParcels(prev => prev.map(p => {
      if (p.id === parcelId) {
        const newPoints = [...p.points];
        newPoints[pointIndex] = [newLatLng.lat, newLatLng.lng];
        return { 
          ...p, 
          points: newPoints,
          area: calculateArea(newPoints)
        };
      }
      return p;
    }));
  };

  const moveParcel = (parcelId: string, oldCenter: { lat: number, lng: number }, newCenter: { lat: number, lng: number }) => {
    const latDiff = newCenter.lat - oldCenter.lat;
    const lngDiff = newCenter.lng - oldCenter.lng;

    setParcels(prev => prev.map(p => {
      if (p.id === parcelId) {
        const newPoints: [number, number][] = p.points.map(pt => [pt[0] + latDiff, pt[1] + lngDiff]);
        return { 
          ...p, 
          points: newPoints
        };
      }
      return p;
    }));
  };

  const calculateCentroid = (points: [number, number][]): [number, number] => {
    const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    return [lat, lng];
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // Simple validation of imported objects
          const validParcels = json.filter(p => p.id && p.name && Array.isArray(p.points));
          setParcels(prev => [...prev, ...validParcels]);
          alert(`Berhasil mengimpor ${validParcels.length} kavling.`);
        } else {
          alert('Format file tidak valid. Harap gunakan format JSON yang berisi array kavling.');
        }
      } catch (error) {
        alert('Gagal membaca file JSON.');
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportToSVG = () => {
    if (parcels.length === 0) {
      alert('Tidak ada kavling untuk diekspor.');
      return;
    }

    // Simple SVG export logic
    // Find bounding box
    const allPoints = parcels.flatMap(p => p.points);
    const lats = allPoints.map(p => p[0]);
    const lngs = allPoints.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const width = 800;
    const height = 600;
    const padding = 50;

    const scaleX = (width - padding * 2) / (maxLng - minLng);
    const scaleY = (height - padding * 2) / (maxLat - minLat);

    const mapToSVG = (lat: number, lng: number) => {
      const x = padding + (lng - minLng) * scaleX;
      const y = height - (padding + (lat - minLat) * scaleY);
      return `${x},${y}`;
    };

    let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svgContent += `<rect width="100%" height="100%" fill="#f8fafc" />\n`;

    parcels.forEach(parcel => {
      const pathData = parcel.points.map((p, i) => (i === 0 ? 'M' : 'L') + mapToSVG(p[0], p[1])).join(' ') + ' Z';
      svgContent += `  <path d="${pathData}" fill="${parcel.color}" fill-opacity="0.4" stroke="${parcel.color}" stroke-width="2" />\n`;
      
      // Add label at the first point
      const labelPos = mapToSVG(parcel.points[0][0], parcel.points[0][1]);
      svgContent += `  <text x="${labelPos.split(',')[0]}" y="${labelPos.split(',')[1]}" font-size="12" fill="#334155">${parcel.name}</text>\n`;
    });

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'peta-kavling.svg';
    link.click();
  };

  if (!L) {
    return <div className="flex items-center justify-center min-h-screen">Loading Map...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white shadow-xl transition-all duration-300 flex flex-col border-r border-slate-200 z-50`}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-orange-500 text-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐱</span>
            <h1 className="font-bold text-lg truncate tracking-tight">TanahSiOren</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHelpModal(true)} className="text-white hover:text-orange-100 transition-colors" title="Bantuan">❓</button>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Actions */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Kontrol Peta</h2>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setMode(mode === 'adding-house' ? 'none' : 'adding-house')}
                className={`w-full py-2 px-4 rounded text-sm font-medium flex items-center gap-2 border transition-all
                  ${mode === 'adding-house' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}
              >
                {mode === 'adding-house' ? '✕ Batal Tambah Rumah' : '🏠 Tambah Rumah'}
              </button>
              <button
                onClick={() => {
                  setMode(mode === 'drawing-parcel' ? 'none' : 'drawing-parcel');
                  setCurrentParcelPoints([]);
                }}
                className={`w-full py-2 px-4 rounded text-sm font-medium flex items-center gap-2 border transition-all
                  ${mode === 'drawing-parcel' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}
              >
                {mode === 'drawing-parcel' ? '✕ Batal Gambar Kavling' : '📐 Gambar Kavling'}
              </button>
            </div>
          </section>

          {/* Layer Controls */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Layer & Ekspor</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowParcels(!showParcels)}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium flex items-center justify-between"
              >
                <span>Layer Kavling</span>
                <span>{showParcels ? '👁️' : '🙈'}</span>
              </button>
              <button
                onClick={() => setShowBaseMap(!showBaseMap)}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium flex items-center justify-between"
              >
                <span>Layer Peta Dasar</span>
                <span>{showBaseMap ? '🗺️' : '⚪'}</span>
              </button>
              <button
                onClick={() => setIsMapLocked(!isMapLocked)}
                className={`w-full py-2 px-4 rounded text-sm font-medium flex items-center justify-between border transition-all
                  ${isMapLocked ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent'}`}
              >
                <span>{isMapLocked ? '🔒 Peta Terkunci' : '🔓 Kunci Peta'}</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={exportToSVG}
                  className="flex-1 py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center justify-center gap-1 border border-blue-100"
                >
                  💾 SVG
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded text-xs font-medium flex items-center justify-center gap-1 border border-orange-100"
                >
                  🖨️ Cetak
                </button>
                <label className="flex-1 py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center justify-center gap-1 border border-purple-100 cursor-pointer text-center">
                  📥 Impor
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
              </div>
            </div>
          </section>

          {/* Parcel List */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Daftar Kavling ({parcels.length})</h2>
            <div className="space-y-2">
              {parcels.map(parcel => (
                <div key={parcel.id} className="p-3 bg-white border border-slate-200 rounded hover:shadow-md transition-shadow group relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: parcel.color }}></div>
                      <span className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{parcel.name}</span>
                    </div>
                    <button 
                      onClick={() => toggleParcelStatus(parcel.id)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all
                        ${parcel.status === 'tersedia' 
                          ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100' 
                          : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'}`}
                    >
                      {parcel.status.toUpperCase()}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Luas: {parcel.area.toLocaleString('id-ID', { maximumFractionDigits: 2 })} m²</p>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => setMapCenter(parcel.points[0])}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      LIHAT
                    </button>
                    <button 
                      onClick={() => setEditingParcelId(editingParcelId === parcel.id ? null : parcel.id)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all
                        ${editingParcelId === parcel.id 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                    >
                      {editingParcelId === parcel.id ? 'SELESAI' : 'EDIT TITIK'}
                    </button>
                    <button 
                      onClick={() => deleteParcel(parcel.id)}
                      className="text-[10px] text-red-500 font-bold hover:underline ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      HAPUS
                    </button>
                  </div>
                </div>
              ))}
              {parcels.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Belum ada kavling</p>}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-center">
          TanahSiOren - Mapping System v2.5 🐱
        </div>
      </aside>

      {/* Main Content (Map) */}
      <main className="flex-1 relative flex flex-col">
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute left-4 top-4 z-[1000] bg-white p-2 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all ${isSidebarOpen ? 'translate-x-0' : 'translate-x-0'}`}
        >
          {isSidebarOpen ? '◀' : '▶'}
        </button>

        {/* Floating Forms */}
        {mode === 'adding-house' && (
          <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-2xl border border-blue-200 w-72 animate-in slide-in-from-right-4">
            <h3 className="font-bold mb-3 text-blue-700">Detail Rumah Baru</h3>
            <div className="space-y-2">
              <input type="text" value={newHouseName} onChange={(e) => setNewHouseName(e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded" placeholder="Nama Rumah" />
              <input type="text" value={newHouseDescription} onChange={(e) => setNewHouseDescription(e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded" placeholder="Deskripsi" />
              <input type="text" value={newHouseImageUrl} onChange={(e) => setNewHouseImageUrl(e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded" placeholder="URL Gambar" />
              <button onClick={handleAddHouse} className="w-full py-2 bg-blue-600 text-white rounded text-sm font-bold mt-2">Simpan Rumah</button>
            </div>
          </div>
        )}

        {mode === 'drawing-parcel' && (
          <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-2xl border border-purple-200 w-72 animate-in slide-in-from-right-4">
            <h3 className="font-bold mb-1 text-purple-700">Gambar Kavling</h3>
            <p className="text-[10px] text-slate-500 mb-3">Klik titik-titik di peta. Double-click untuk selesai.</p>
            <div className="space-y-2">
              <input type="text" value={newParcelName} onChange={(e) => setNewParcelName(e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded" placeholder="Nama Kavling (e.g. A-1)" />
              
              <div className="flex bg-slate-100 p-1 rounded gap-1">
                <button 
                  onClick={() => setNewParcelStatus('tersedia')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded transition-all ${newParcelStatus === 'tersedia' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  TERSEDIA
                </button>
                <button 
                  onClick={() => setNewParcelStatus('terjual')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded transition-all ${newParcelStatus === 'terjual' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  TERJUAL
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentParcelPoints(currentParcelPoints.slice(0, -1))} 
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold"
                  disabled={currentParcelPoints.length === 0}
                >
                  Undo
                </button>
                <button onClick={handleSaveParcel} className="flex-1 py-2 bg-purple-600 text-white rounded text-xs font-bold">Simpan</button>
              </div>
            </div>
          </div>
        )}

        {/* Zoom Indicator */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white px-3 py-1 rounded-full shadow-md border border-slate-200 text-xs font-mono text-slate-600">
          Zoom: {zoomLevel}
        </div>

        {/* Map */}
        <div className="flex-1 bg-white">
          <MapContainer 
            center={mapCenter} 
            zoom={zoomLevel} 
            maxZoom={30}
            style={{ height: '100%', width: '100%' }}
            dragging={!isMapLocked}
            zoomControl={!isMapLocked}
            doubleClickZoom={!isMapLocked && mode === 'none'}
            scrollWheelZoom={!isMapLocked}
            touchZoom={!isMapLocked}
            boxZoom={!isMapLocked}
            keyboard={!isMapLocked}
            ref={setMapInstance}
          >
            {showBaseMap && (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
                maxZoom={30}
                maxNativeZoom={19}
              />
            )}
            
            <MapClickHandler 
              onMapClick={handleMapClick} 
              onMapDblClick={handleMapDblClick}
              onZoomChange={setZoomLevel}
              isActive={mode !== 'none'} 
            />

            {/* Render Houses */}
            {houses.map((house, index) => (
              <Marker key={`house-${index}`} position={[house.geometry.coordinates[1], house.geometry.coordinates[0]]}>
                <Popup>
                  <div className="text-center w-40">
                    <h3 className="font-bold">{house.properties.name}</h3>
                    <p className="text-xs my-1">{house.properties.description}</p>
                    {house.properties.imageUrl && (
                      <img src={house.properties.imageUrl} alt={house.properties.name} className="w-full h-20 object-cover rounded shadow-sm" />
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Saved Parcels */}
            {showParcels && parcels.map((parcel) => (
              <Polygon key={parcel.id} positions={parcel.points} pathOptions={{ color: parcel.color, fillColor: parcel.color, fillOpacity: 0.4 }}>
                <Popup>
                  <div className="text-center">
                    <h3 className="font-bold">{parcel.name}</h3>
                    <p className="text-xs font-semibold text-blue-600">{parcel.area.toLocaleString('id-ID', { maximumFractionDigits: 2 })} m²</p>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Render Current Drawing Parcel */}
            {currentParcelPoints.length > 0 && (
              <>
                <Polyline positions={currentParcelPoints} pathOptions={{ color: '#9333ea', dashArray: '5, 10' }} />
                {currentParcelPoints.map((point, idx) => (
                  <Marker 
                    key={`point-${idx}`} 
                    position={point} 
                    icon={L ? L.divIcon({ 
                      className: 'bg-purple-600 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm',
                      iconSize: [10, 10]
                    }) : undefined} 
                  />
                ))}
              </>
            )}

            {/* Render Editing Markers */}
            {editingParcelId && parcels.find(p => p.id === editingParcelId) && (
              <>
                {/* Center Drag Anchor */}
                <Marker 
                  position={calculateCentroid(parcels.find(p => p.id === editingParcelId)!.points)}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const parcel = parcels.find(p => p.id === editingParcelId)!;
                      const oldCenter = calculateCentroid(parcel.points);
                      const newCenter = e.target.getLatLng();
                      moveParcel(editingParcelId, { lat: oldCenter[0], lng: oldCenter[1] }, newCenter);
                    },
                  }}
                  icon={L ? L.divIcon({ 
                    className: 'bg-blue-600 w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold',
                    html: '✢',
                    iconSize: [20, 20]
                  }) : undefined} 
                />

                {/* Vertex Markers */}
                {parcels.find(p => p.id === editingParcelId)!.points.map((point, idx) => (
                  <Marker 
                    key={`edit-${editingParcelId}-${idx}`} 
                    position={point} 
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        updateParcelPoint(editingParcelId, idx, position);
                      },
                    }}
                    icon={L ? L.divIcon({ 
                      className: 'bg-yellow-400 w-3 h-3 rounded-full border-2 border-slate-800 shadow-md',
                      iconSize: [12, 12]
                    }) : undefined} 
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>
      </main>

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
}

// Help Modal Component
function HelpModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-blue-700 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Panduan Penggunaan</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors">✕</button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Create */}
          <section>
            <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-3">
              <span className="bg-blue-100 p-1.5 rounded-lg">📐</span> Membuat Kavling Baru
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm list-disc pl-5">
              <li>Klik tombol <b>"Gambar Kavling"</b> di sidebar kiri.</li>
              <li>Klik pada peta untuk menentukan setiap sudut kavling (minimal 3 titik).</li>
              <li>Gunakan <b>Double-Click</b> pada titik terakhir untuk otomatis menyelesaikan gambar.</li>
              <li>Pilih status <b>Tersedia</b> (Hijau) atau <b>Terjual</b> (Merah) sebelum menyimpan.</li>
            </ul>
          </section>

          {/* Edit Shape */}
          <section>
            <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2 mb-3">
              <span className="bg-purple-100 p-1.5 rounded-lg">🔧</span> Merubah Bentuk (Edit Shape)
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm list-disc pl-5">
              <li>Cari kavling yang ingin diubah pada daftar di sidebar.</li>
              <li>Klik tombol <b>"EDIT TITIK"</b>.</li>
              <li>Tarik <b>titik kuning</b> di sudut kavling untuk mengubah bentuknya.</li>
              <li>Luas kavling akan dihitung ulang secara otomatis saat Anda mengedit.</li>
            </ul>
          </section>

          {/* Move */}
          <section>
            <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2 mb-3">
              <span className="bg-blue-100 p-1.5 rounded-lg">✢</span> Menggeser Lokasi Kavling
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm list-disc pl-5">
              <li>Aktifkan mode edit dengan klik <b>"EDIT TITIK"</b>.</li>
              <li>Tarik <b>titik biru besar (✢)</b> yang muncul di tengah kavling.</li>
              <li>Seluruh area kavling akan bergeser mengikuti tarikan Anda tanpa merubah bentuknya.</li>
            </ul>
          </section>

          {/* Lock & Layer */}
          <section>
            <h3 className="text-lg font-bold text-orange-600 flex items-center gap-2 mb-3">
              <span className="bg-orange-100 p-1.5 rounded-lg">🔒</span> Kunci Peta & Layer
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm list-disc pl-5">
              <li>Gunakan <b>"Kunci Peta"</b> agar peta tidak sengaja bergeser atau zoom saat Anda bekerja.</li>
              <li>Gunakan <b>"Layer Peta Dasar"</b> (ikon 🗺️) untuk menyembunyikan peta dan bekerja di latar putih bersih.</li>
              <li>Klik label status <b>"TERSEDIA/TERJUAL"</b> di sidebar untuk mengubah status kavling dengan cepat.</li>
            </ul>
          </section>

          <div className="pt-4 border-t border-slate-100">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-lg shadow-blue-200"
            >
              Saya Mengerti, Lanjutkan Kerja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
