#!/usr/bin/env node
/*
 * Generate the dot-matrix world map dataset for /stats/.
 *
 *   node scripts/gen-world-dots.mjs
 *
 * Rasterizes country polygons onto a lat/lon grid and writes
 * src/data/world-dots.json: { cols, rows, dots: [[col, row, "AU"], ...] }.
 * Country codes are ISO 3166-1 alpha-2 (what Cloudflare's request.cf.country reports).
 *
 * Sources (fetched at generation time only; nothing runs at build/site time):
 *   - countries GeoJSON (ISO_A3 ids): johan/world.geo.json
 *   - A3 -> A2 mapping: lukes/ISO-3166-Countries-with-Regional-Codes
 */
import { writeFileSync } from "node:fs";

const GEO_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
const ISO_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";

// Grid resolution: ~1.4° per dot horizontally. Latitude clamped to inhabited
// bands; a Mercator-ish vertical compression keeps high latitudes compact.
const COLS = 240;
const LAT_MIN = -56;
const LAT_MAX = 74;
const LAT_STEP = 1.4;

const geo = await (await fetch(GEO_URL)).json();
const iso = await (await fetch(ISO_URL)).json();

const a3toA2 = new Map(iso.map((c) => [c["alpha-3"], c["alpha-2"]]));

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lon, lat, polygon) {
  if (!pointInRing(lon, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lon, lat, polygon[i])) return false; // hole
  }
  return true;
}

const shapes = [];
for (const feature of geo.features) {
  const a2 = a3toA2.get(feature.id);
  if (!a2) continue;
  const polys =
    feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const poly of polys) {
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    for (const [lon, lat] of poly[0]) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    shapes.push({ a2, poly, bbox: [minLon, minLat, maxLon, maxLat] });
  }
}

const dots = [];
let rows = 0;
for (let lat = LAT_MAX, row = 0; lat >= LAT_MIN; lat -= LAT_STEP, row++) {
  rows = row + 1;
  for (let col = 0; col < COLS; col++) {
    const lon = -180 + (360 * (col + 0.5)) / COLS;
    for (const shape of shapes) {
      const [minLon, minLat, maxLon, maxLat] = shape.bbox;
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      if (pointInPolygon(lon, lat, shape.poly)) {
        dots.push([col, row, shape.a2]);
        break;
      }
    }
  }
}

const out = { cols: COLS, rows, dots };
writeFileSync("src/data/world-dots.json", JSON.stringify(out), "utf8");

const countries = new Set(dots.map((d) => d[2]));
console.log(`world-dots.json: ${dots.length} dots, ${countries.size} countries, grid ${COLS}x${rows}`);
