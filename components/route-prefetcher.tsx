"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import prefetchGraph from "@/config/route-prefetch-graph.json";

type NormalizeRule = { prefix: string; to: string };
type GraphConfig = {
  fallbackRadius: number;
  normalize: NormalizeRule[];
  neighbors: Record<string, string[]>;
};

const graph = prefetchGraph as GraphConfig;
const ROUTE_ORDER = ["/dashboard", "/students", "/students/new"];

function normalizePath(pathname: string): string {
  for (const rule of graph.normalize) {
    if (pathname.startsWith(rule.prefix)) return rule.to;
  }
  return pathname;
}

export function RoutePrefetcher() {
  const pathname = usePathname();
  const router = useRouter();
  const prefetched = useRef<Set<string>>(new Set());

  const targets = useMemo(() => {
    const normalized = normalizePath(pathname);
    const fromGraph = graph.neighbors[normalized];
    if (fromGraph?.length) return fromGraph;

    const idx = ROUTE_ORDER.findIndex((x) => x === normalized);
    if (idx === -1) return [] as string[];
    const out: string[] = [];
    for (let d = 1; d <= graph.fallbackRadius; d += 1) {
      const left = ROUTE_ORDER[idx - d];
      const right = ROUTE_ORDER[idx + d];
      if (left) out.push(left);
      if (right) out.push(right);
    }
    return out;
  }, [pathname]);

  useEffect(() => {
    for (const route of targets) {
      if (route === pathname) continue;
      if (prefetched.current.has(route)) continue;
      router.prefetch(route);
      prefetched.current.add(route);
    }
  }, [pathname, router, targets]);

  return null;
}
