import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ViolationRecord } from '../types';

interface LeafletMapProps {
  violations: ViolationRecord[];
  onSelectCase: (violation: ViolationRecord) => void;
  selectedCaseId?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ violations, onSelectCase, selectedCaseId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center on Hyderabad IT Corridor (Cyber Towers junction coordinates)
      const map = L.map(mapContainerRef.current, {
        center: [17.445, 78.380],
        zoom: 13,
        zoomControl: true,
      });

      // CartoDB Dark Matter tiles for modern government dark mode aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // cleanup on unmount
    };
  }, []);

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
            <div style="width: 6px; height: 6px; background-color: #0b1120; border-radius: 50%;"></div>
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
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
      
      {/* Legend Badge Overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-lg text-xs space-y-1.5 shadow-lg">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5">Violation Severity</div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          <span className="text-slate-300">Compound / Triple Riding</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-slate-300">Helmet Violation</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
          <span className="text-slate-300">Drunk Driving / Sobriety</span>
        </div>
      </div>
    </div>
  );
};
