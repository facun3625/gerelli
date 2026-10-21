"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PIN_ICON = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#1e658c;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
  className: "",
});

export function DevelopmentLocationMap({ latitude, longitude, name, address }: { latitude: number; longitude: number; name: string; address: string }) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[latitude, longitude]} icon={PIN_ICON}>
        <Popup><strong>{name}</strong><br />{address}</Popup>
      </Marker>
    </MapContainer>
  );
}
