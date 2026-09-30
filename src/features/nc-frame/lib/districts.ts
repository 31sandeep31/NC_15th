export type DistrictEntry = {
  district: string;
  districtNe: string;
  province: string;
  provinceNe: string;
  file: string;
};

export type DistrictShape = {
  d: string;
  width: number;
  height: number;
};

type LonLat = [number, number];

type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: LonLat[][] }
  | { type: "MultiPolygon"; coordinates: LonLat[][][] };

type GeoJsonFeature = {
  properties?: { District?: string };
  geometry?: GeoJsonGeometry | null;
};

type GeoJsonFile = {
  features?: GeoJsonFeature[];
};

const VIEWBOX_SIZE = 1000;
const MIN_STEP = 0.4;

let manifestPromise: Promise<DistrictEntry[]> | null = null;
const provinceCache = new Map<string, Promise<GeoJsonFile>>();
const shapeCache = new Map<string, Promise<DistrictShape>>();

export function loadDistricts(): Promise<DistrictEntry[]> {
  if (!manifestPromise) {
    manifestPromise = fetch("/districts/manifest.json").then((res) => {
      if (!res.ok) throw new Error("District manifest failed to load");
      return res.json() as Promise<DistrictEntry[]>;
    });
  }
  return manifestPromise;
}

function loadProvince(file: string): Promise<GeoJsonFile> {
  const cached = provinceCache.get(file);
  if (cached) return cached;

  const promise = fetch(`/districts/${file}`).then((res) => {
    if (!res.ok) throw new Error(`District data failed to load: ${file}`);
    return res.json() as Promise<GeoJsonFile>;
  });
  provinceCache.set(file, promise);
  return promise;
}

function toRings(geometry: GeoJsonGeometry | null | undefined): LonLat[][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

// Web Mercator, good enough for district silhouettes at this scale.
// Both axes are returned in radians so the aspect ratio is preserved.
function project(lon: number, lat: number): LonLat {
  const clamped = Math.max(-85, Math.min(85, lat));
  const rad = (clamped * Math.PI) / 180;
  return [
    (lon * Math.PI) / 180,
    -Math.log(Math.tan(Math.PI / 4 + rad / 2)),
  ];
}

function buildShape(polygons: LonLat[][][]): DistrictShape {
  const projected = polygons.map((polygon) =>
    polygon.map((ring) => ring.map(([lon, lat]) => project(lon, lat))),
  );

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const polygon of projected) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = VIEWBOX_SIZE / Math.max(spanX, spanY);

  const width = Math.max(1, spanX * scale);
  const height = Math.max(1, spanY * scale);
  const offsetX = (VIEWBOX_SIZE - width) / 2;
  const offsetY = (VIEWBOX_SIZE - height) / 2;

  const parts: string[] = [];
  for (const polygon of projected) {
    for (const ring of polygon) {
      let d = "";
      let prevX = Number.NaN;
      let prevY = Number.NaN;
      for (const [rawX, rawY] of ring) {
        const x = Number((((rawX - minX) * scale + offsetX)).toFixed(1));
        const y = Number((((rawY - minY) * scale + offsetY)).toFixed(1));
        if (Number.isFinite(prevX) && Math.abs(x - prevX) + Math.abs(y - prevY) < MIN_STEP) {
          continue;
        }
        d += `${d === "" ? "M" : "L"}${x} ${y}`;
        prevX = x;
        prevY = y;
      }
      if (d !== "") parts.push(`${d}Z`);
    }
  }

  return {
    d: parts.join(""),
    height: VIEWBOX_SIZE,
    width: VIEWBOX_SIZE,
  };
}

export function loadDistrictShape(entry: DistrictEntry): Promise<DistrictShape> {
  const key = `${entry.file}:${entry.district}`;
  const cached = shapeCache.get(key);
  if (cached) return cached;

  const promise = loadProvince(entry.file).then((geo) => {
    const polygons: LonLat[][][] = [];
    for (const feature of geo.features ?? []) {
      if (feature.properties?.District !== entry.district) continue;
      for (const polygon of toRings(feature.geometry)) {
        polygons.push(polygon);
      }
    }
    if (polygons.length === 0) {
      throw new Error(`Map not found for ${entry.district}`);
    }
    return buildShape(polygons);
  });

  shapeCache.set(key, promise);
  return promise;
}

export function buildMapSvg(shape: DistrictShape, fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${shape.width} ${shape.height}" width="${shape.width}" height="${shape.height}"><path d="${shape.d}" fill="${fill}" fill-rule="evenodd" /></svg>`;
}

export function mapSvgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
