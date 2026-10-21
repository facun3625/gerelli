import { prisma } from "@/lib/prisma";
import { parseDevice, parseBrowser, parseOs, DEVICE_LABELS } from "@/lib/user-agent";
import { parseTrafficSource } from "@/lib/traffic-source";
import { lookupGeo } from "@/lib/ip-geo";

export type SiteVisitStats = {
  totalVisits: number;
  uniqueVisitors: number;
  byPage: { label: string; value: number }[];
  bySource: { label: string; value: number }[];
  byDevice: { label: string; value: number }[];
  byBrowser: { label: string; value: number }[];
  byOs: { label: string; value: number }[];
  byCountry: { label: string; value: number }[];
  byCity: { label: string; value: number }[];
};

function tally(items: string[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}

// Todo se parsea acá, no al guardar — así una mejora futura al parser de
// user-agent/referrer/geo aplica retroactivamente a los datos ya guardados.
export async function getSiteVisitStats(range: { from: Date; to: Date }): Promise<SiteVisitStats> {
  const visits = await prisma.siteVisit.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { path: true, referrer: true, userAgent: true, visitorId: true, ip: true },
  });

  const uniqueVisitorIds = new Set(visits.map((v) => v.visitorId).filter((v): v is string => Boolean(v)));

  // Un solo lookup por IP distinta, no uno por visita — la misma persona
  // suele volver varias veces con la misma IP.
  const uniqueIps = [...new Set(visits.map((v) => v.ip).filter((v): v is string => Boolean(v)))];
  const geoEntries = await Promise.all(uniqueIps.map(async (ip) => [ip, await lookupGeo(ip)] as const));
  const geoByIp = new Map(geoEntries);

  const countries: string[] = [];
  const cities: string[] = [];
  for (const v of visits) {
    const geo = v.ip ? geoByIp.get(v.ip) : null;
    if (geo?.country) countries.push(geo.country);
    if (geo?.city) cities.push(`${geo.city}, ${geo.country ?? "?"}`);
  }

  return {
    totalVisits: visits.length,
    uniqueVisitors: uniqueVisitorIds.size,
    byPage: tally(visits.map((v) => v.path)),
    bySource: tally(visits.map((v) => parseTrafficSource(v.referrer))),
    byDevice: tally(visits.map((v) => DEVICE_LABELS[parseDevice(v.userAgent)])),
    byBrowser: tally(visits.map((v) => parseBrowser(v.userAgent))),
    byOs: tally(visits.map((v) => parseOs(v.userAgent))),
    byCountry: tally(countries),
    byCity: tally(cities),
  };
}
