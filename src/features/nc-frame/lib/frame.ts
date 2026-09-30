export type NcTextConfig = {
  color: string;
  fontFamily: string;
  fontSizePx: number;
  fontWeight: string;
  scale: number;
  backgroundColor: string;
};

export type NcPosition = {
  x: number;
  y: number;
};

export const NC_DEFAULT_COLORS = {
  map: "#0A5703",
  mapLabel: "#FFFFFF",
  name: "#292525",
  role: "#0A5703",
} as const;

export const NC_FRAME: {
  id: string;
  src: string;
  overlaySrc: string;
  hasOverlay: boolean;
  map: { widthPct: number };
  mapLabel: NcTextConfig;
  nameText: NcTextConfig;
  roleText: NcTextConfig;
} = {
  id: "nc15",
  src: "/frames/nc/frame.jpg",
  overlaySrc: "/frames/nc/footer.png",
  hasOverlay: true,
  map: {
    widthPct: 38,
  },
  mapLabel: {
    backgroundColor: "transparent",
    color: NC_DEFAULT_COLORS.mapLabel,
    fontFamily: "Vespre",
    fontSizePx: 44,
    fontWeight: "700",
    scale: 1,
  },
  nameText: {
    backgroundColor: "transparent",
    color: NC_DEFAULT_COLORS.name,
    fontFamily: "Yatra",
    fontSizePx: 88,
    fontWeight: "700",
    scale: 1,
  },
  roleText: {
    backgroundColor: "transparent",
    color: NC_DEFAULT_COLORS.role,
    fontFamily: "Vespre",
    fontSizePx: 46,
    fontWeight: "600",
    scale: 1,
  },
};

export type NcLayoutPresetId = "text-left" | "text-right";

export type NcLayoutPreset = {
  id: NcLayoutPresetId;
  label: string;
  description: string;
  preview: string;
  name: NcPosition;
  role: NcPosition;
  map: NcPosition;
  mapLabel: NcPosition;
};

export const NC_LAYOUT_PRESETS: NcLayoutPreset[] = [
  {
    id: "text-left",
    label: "Text left",
    description: "Name, district and map on the left, photo on the right",
    preview: "/frames/nc/sample-text-left.jpg",
    name: { x: 6, y: 31 },
    role: { x: 15, y: 40 },
    map: { x: 6, y: 55 },
    mapLabel: { x: 50, y: 74 },
  },
  {
    id: "text-right",
    label: "Text right",
    description: "Name, district and map on the right, photo on the left",
    preview: "/frames/nc/sample-text-right.jpg",
    name: { x: 39, y: 35 },
    role: { x: 49, y: 43 },
    map: { x: 56, y: 52 },
    mapLabel: { x: 50, y: 74 },
  },
];

export const DEFAULT_LAYOUT_ID: NcLayoutPresetId = "text-left";
