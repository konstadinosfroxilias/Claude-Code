"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapViewProps } from "./map-view-impl";

/** Leaflet only renders client-side — load it lazily with a skeleton. */
export const MapView = dynamic<MapViewProps>(
  () => import("./map-view-impl"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full rounded-lg" />,
  },
);
