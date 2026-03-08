import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationPoint } from "../../types";
import { calculateDistance } from "../../utils/geolocation";
import { paceColorFor } from "../../utils/runFormatting";

interface PerformanceMapProps {
  locations:  LocationPoint[];
  targetPace: number | null;
}

const LEGEND_ITEMS = [
  { color: "#34d399", label: "Faster"       },
  { color: "#4ade80", label: "On target"    },
  { color: "#facc15", label: "Slightly slow"},
  { color: "#f97316", label: "Slow"         },
  { color: "#f87171", label: "Very slow"    },
] as const;

export function PerformanceMap({ locations, targetPace }: PerformanceMapProps) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || locations.length < 2) return;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    mapInst.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);

    // Build cumulative distances for pace-segment colouring
    const cumDist = [0];
    for (let i = 1; i < locations.length; i++) {
      cumDist.push(cumDist[i - 1] + calculateDistance(
        locations[i - 1].latitude, locations[i - 1].longitude,
        locations[i].latitude,     locations[i].longitude,
      ));
    }

    // Draw ~150m pace-coloured polyline segments
    const SEG_M = 150;
    let segStart = 0;
    while (segStart < locations.length - 1) {
      let segEnd = segStart + 1;
      while (segEnd < locations.length - 1 && cumDist[segEnd] - cumDist[segStart] < SEG_M) segEnd++;
      const timeDelta = (locations[segEnd].timestamp - locations[segStart].timestamp) / 1000;
      const distDelta = cumDist[segEnd] - cumDist[segStart];
      const segPace   = (distDelta > 5 && timeDelta > 1) ? (timeDelta / 60) / (distDelta / 1000) : targetPace ?? 6;
      L.polyline(
        locations.slice(segStart, segEnd + 1).map(p => [p.latitude, p.longitude] as [number, number]),
        { color: paceColorFor(segPace, targetPace), weight: 5, opacity: 0.9, lineCap: "round" },
      ).addTo(map);
      segStart = segEnd;
    }

    // Start / finish markers
    L.circleMarker([locations[0].latitude, locations[0].longitude],
      { radius: 7, fillColor: "#4ade80", color: "#fff", weight: 2, fillOpacity: 1 },
    ).bindTooltip("Start").addTo(map);
    L.circleMarker(
      [locations[locations.length - 1].latitude, locations[locations.length - 1].longitude],
      { radius: 7, fillColor: "#f87171", color: "#fff", weight: 2, fillOpacity: 1 },
    ).bindTooltip("Finish").addTo(map);

    map.fitBounds(
      L.latLngBounds(locations.map(l => [l.latitude, l.longitude] as [number, number])),
      { padding: [24, 24] },
    );
    return () => { map.remove(); mapInst.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={mapRef} style={{ width: "100%", height: 240, borderRadius: 12, overflow: "hidden" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {LEGEND_ITEMS.map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#64748b" }}>
            <div style={{ width: 16, height: 4, background: color, borderRadius: 2 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
