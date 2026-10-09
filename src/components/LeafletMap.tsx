import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ViolationRecord } from '../types';

interface LeafletMapProps {
  violations: ViolationRecord[];
  onSelectCase: (violation: ViolationRecord) => void;
  selectedCaseId?: string;
}

const GEOAPIFY_API_KEY =
  (import.meta as any).env?.VITE_GEOAPIFY_API_KEY ||
  'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfcHMwZHYwc2EiLCJqdGkiOiI2OTVhMzY1NTU0ZDA5ZDAwMmNiYmFmYTNlYWVhMTFjYSJ9.4IEd2aL84ztGIFx3LlSiv3XTo_AqwWF2d6px9f9-9tk';

export const LeafletMap: React.FC<LeafletMapProps> = ({ violations, onSelectCase, selectedCaseId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapStyle, setMapStyle] = React.useState<'dark' | 'streets' | 'satellite'>('dark');

  const getTileConfig = (style: 'dark' | 'streets' | 'satellite') => {
    switch (style) {
      case 'streets':
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: 'abc',
          className: '',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        };
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          subdomains: 'abcd',
          className: '',
          attribution: 'Tiles &copy; Esri World Imagery'
        };
      case 'dark':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: 'abc',
          className: 'radar-dark-tiles',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        };
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center on Hyderabad IT Corridor (Cyber Towers junction coordinates)
      const map = L.map(mapContainerRef.current, {
        center: [17.445, 78.380],
        zoom: 13,
        zoomControl: true,
      });

      const config = getTileConfig(mapStyle);
      const tiles = L.tileLayer(config.url, {
        attribution: config.attribution,
        subdomains: config.subdomains,
        className: config.className,
        maxZoom: 19
      }).addTo(map);

      tileLayerRef.current = tiles;
      markersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // cleanup on unmount
    };
  }, []);

  // Update tile style when selected
  useEffect(() => {
    if (tileLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const config = getTileConfig(mapStyle);
      const newTiles = L.tileLayer(config.url, {
        attribution: config.attribution,
        subdomains: config.subdomains,
        className: config.className,
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newTiles;
    }
  }, [mapStyle]);

  // Update markers when violations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    violations.forEach((v) => {
      // Determine marker color based on violation severity
      let markerColor = '#f59e0b'; // Amber for Helmet
      let badgeLabel = 'Helmet';
      
      if (v.tripleRiding && v.helmetViolation) {
        markerColor = '#ef4444'; // Red for Compound
        badgeLabel = 'Compound';
      } else if (v.tripleRiding) {
        markerColor = '#f97316'; // Orange for Triple riding
        badgeLabel = 'Triple Riding';
      } else if (v.drunkDriving) {
        markerColor = '#a855f7'; // Purple for Drunk driving
        badgeLabel = 'BAC Positive';
      }

      const isSelected = selectedCaseId === v.id;

      // Custom HTML pin icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            width: ${isSelected ? '28px' : '20px'};
            height: ${isSelected ? '28px' : '20px'};
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px ${markerColor};
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="width: 6px; height: 6px; background-color: #f8fafc; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: isSelected ? [28, 28] : [20, 20],
        iconAnchor: isSelected ? [14, 14] : [10, 10],
      });

      const marker = L.marker([v.latitude, v.longitude], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 800; color: #f59e0b; font-size: 13px;">${v.caseNumber}</span>
            <span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${v.status}</span>
          </div>
          <div style="font-weight: 700; color: #ffffff; font-size: 14px; margin-bottom: 4px; letter-spacing: 0.5px;">${v.vehicleNumber}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">${v.location}</div>
          <div style="color: #cbd5e1; font-size: 11px; margin-bottom: 8px;">
            <strong>Violations:</strong> ${[
              v.helmetViolation ? 'Helmet Violation' : null,
              v.tripleRiding ? 'Triple Riding' : null,
              v.noLicense ? 'No Licence' : null,
              v.drunkDriving ? 'Drunk Driving' : null,
              v.minorRiding ? 'Minor Rider' : null
            ].filter(Boolean).join(', ')}
          </div>
          <div style="color: #64748b; font-size: 10px; margin-bottom: 8px;">Time: ${v.timestamp}</div>
          <button id="inspect-case-${v.id}" style="
            background: #f59e0b;
            color: #0b1120;
            border: none;
            width: 100%;
            padding: 6px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
          ">INSPECT CASE EVIDENCE</button>
        </div>
      `;

      popupContent.querySelector(`#inspect-case-${v.id}`)?.addEventListener('click', () => {
        onSelectCase(v);
      });

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        marker.openPopup();
      });

      markersGroup.addLayer(marker);
    });

    if (violations.length > 0 && selectedCaseId) {
      const selected = violations.find(v => v.id === selectedCaseId);
      if (selected) {
        map.setView([selected.latitude, selected.longitude], 15);
      }
    }
  }, [violations, selectedCaseId, onSelectCase]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-xl bg-white">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
      
      {/* Top Left: GIS Status & Layer Selector */}
      <div className="absolute top-4 left-14 z-[1000] flex flex-wrap items-center gap-2">
        <div className="bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono font-semibold">GIS Engine Active</span>
        </div>

        <div className="bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/60 p-1 rounded-lg text-xs flex items-center space-x-1 shadow-lg">
          <button
            type="button"
            onClick={() => setMapStyle('dark')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${mapStyle === 'dark' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Radar Dark
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('streets')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${mapStyle === 'streets' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${mapStyle === 'satellite' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Legend Badge Overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200 p-3 rounded-lg text-xs space-y-1.5 shadow-lg">
        <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1.5">Violation Severity</div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          <span className="text-slate-700">Compound / Triple Riding</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm shadow-blue-500/50" />
          <span className="text-slate-700">Helmet Violation</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
          <span className="text-slate-700">Drunk Driving / Sobriety</span>
        </div>
      </div>
    </div>
  );
};
