/**
 * MapTracker - Leaflet map component for tracking runner's path
 */

import { useEffect, useRef } from "react";
import type { LocationPoint } from "../types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapTrackerProps {
  lastLocation: LocationPoint | null;
  isRunning: boolean;
  locations?: LocationPoint[];
  isSummary?: boolean;
  fullBleed?: boolean;
}

export function MapTracker({
  lastLocation,
  isRunning,
  locations = [],
  isSummary = false,
  fullBleed = false,
}: MapTrackerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pathRef = useRef<[number, number][]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const locationMarkersRef = useRef<L.CircleMarker[]>([]);

  // Initialize map (only once on mount)
  useEffect(() => {
    if (!mapRef.current) return;

    // Default location (San Francisco)
    const defaultCenter: [number, number] = [37.7749, -122.4194];

    // Initialize Leaflet map
    mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, 16);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);

    // Create polyline for the running path
    polylineRef.current = L.polyline(pathRef.current, {
      color: "#9D4EDD",
      weight: 4,
      opacity: 0.8,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(mapInstanceRef.current);

    // Create marker for current position (will be updated by location effect)
    markerRef.current = L.circleMarker(defaultCenter, {
      radius: 8,
      fillColor: "#9D4EDD",
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 1,
    })
      .addTo(mapInstanceRef.current)
      .bindPopup("Current Location");

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array - only init once

  // Update map with new location (continuous, no dependency on isRunning to avoid re-renders)
  useEffect(() => {
    if (
      !lastLocation ||
      !mapInstanceRef.current ||
      !markerRef.current ||
      !polylineRef.current
    )
      return;

    const newPosition: [number, number] = [
      lastLocation.latitude,
      lastLocation.longitude,
    ];

    // Only add to path if different from last position (avoid duplicates)
    const lastPath = pathRef.current[pathRef.current.length - 1];
    if (
      !lastPath ||
      lastPath[0] !== newPosition[0] ||
      lastPath[1] !== newPosition[1]
    ) {
      pathRef.current.push(newPosition);

      // Update polyline with new path
      polylineRef.current.setLatLngs(pathRef.current);
    }

    // Update marker position
    markerRef.current.setLatLng(newPosition);

    // Pan to position during active run (only)
    if (isRunning && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(newPosition, { animate: false });
    }
  }, [lastLocation, isRunning]);

  // Display all locations in summary mode
  useEffect(() => {
    if (!isSummary || !mapInstanceRef.current || locations.length === 0) return;

    // Clear existing location markers
    locationMarkersRef.current.forEach((marker) => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    locationMarkersRef.current = [];

    // Add location points as markers
    const bounds = L.latLngBounds([]);

    locations.forEach((loc, index) => {
      const marker = L.circleMarker(
        [loc.latitude, loc.longitude] as [number, number],
        {
          radius: 3,
          fillColor: "#9D4EDD",
          color: "#ffffff",
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.6,
        },
      ).addTo(mapInstanceRef.current!);

      locationMarkersRef.current.push(marker);

      // Add to bounds
      bounds.extend([loc.latitude, loc.longitude]);

      // Mark start and end points
      if (index === 0) {
        L.circleMarker([loc.latitude, loc.longitude] as [number, number], {
          radius: 6,
          fillColor: "#00ff00",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        })
          .addTo(mapInstanceRef.current!)
          .bindPopup("Start");
      } else if (index === locations.length - 1) {
        L.circleMarker([loc.latitude, loc.longitude] as [number, number], {
          radius: 6,
          fillColor: "#ff0000",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        })
          .addTo(mapInstanceRef.current!)
          .bindPopup("Finish");
      }
    });

    // Fit map to show all locations
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [isSummary, locations]);

  // When fullBleed, tell Leaflet to re-measure after the container settles
  useEffect(() => {
    if (!fullBleed || !mapInstanceRef.current) return;
    const id = window.setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 50);
    return () => window.clearTimeout(id);
  }, [fullBleed]);

  if (fullBleed) {
    return (
      <div
        ref={mapRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    );
  }

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-2xl app-shadow-card border border-white/10 pointer-events-auto ${
        isSummary ? "h-80 sm:h-96" : "h-64 sm:h-80"
      }`}
      style={{ minHeight: isSummary ? "300px" : "250px" }}
    />
  );
}
