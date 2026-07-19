"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  href?: string;
}

export interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  className?: string;
}

const voltIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#c8f13f;border:3px solid #0a0b0e;box-shadow:0 0 0 2px #c8f13f66, 0 4px 10px rgba(0,0,0,.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

function Recenter({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

export default function MapViewImpl({
  center,
  zoom,
  markers,
  className,
}: MapViewProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      className={className}
      style={{ minHeight: 320 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} zoom={zoom} />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={voltIcon}>
          <Popup>
            <div style={{ padding: "10px 14px", minWidth: 160 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                {m.label}
              </p>
              {m.sub && (
                <p style={{ fontSize: 11, margin: "2px 0 0", opacity: 0.7 }}>
                  {m.sub}
                </p>
              )}
              {m.href && (
                <Link
                  href={m.href}
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#c8f13f",
                  }}
                >
                  →
                </Link>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
