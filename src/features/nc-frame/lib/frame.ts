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

export type NcLayoutPresetId = "text-left" | "text-right" | "default";

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

export type NcOverlayVariant = {
  id: string;
  label: string;
  src: string;
};

export type NcFrameId = "dhanyabaad" | "nc15";

export type NcFrameConfig = {
  id: NcFrameId;
  label: string;
  description: string;
  thumb: string;
  src: string;
  hasOverlay: boolean;
  overlayVariants: NcOverlayVariant[];
  defaultOverlayVariantId: string;
  exportName: string;
  photo: { widthPct: number; x: number; y: number };
  map: { widthPct: number };
  mapLabel: NcTextConfig;
  nameText: NcTextConfig;
  roleText: NcTextConfig;
  layoutPresets: NcLayoutPreset[];
  defaultLayoutId: NcLayoutPresetId;
};

const NC_LAYOUT_PRESETS: NcLayoutPreset[] = [
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

const NC_LAYOUT: NcLayoutPreset = NC_LAYOUT_PRESETS[0];

const DHANYABAAD_LAYOUT_PRESETS: NcLayoutPreset[] = [
  {
    id: "default",
    label: "धन्यवाद",
    description: "Name and roles on the left, district map centre, photo right",
    preview: "/frames/dhanyabad/sample-dhanyabaad.jpg",
    name: { x: 9.11, y: 19.77 },
    role: { x: 8.75, y: 30.07 },
    map: { x: 36.86, y: 30.68 },
    mapLabel: { x: -13.36, y: 44.58 },
  },
];

export const NC_FRAMES: NcFrameConfig[] = [
  {
    id: "nc15",
    label: "NC 15th Mahadhibeshan",
    description: "Convention frame with the party footer band",
    thumb: "/frames/nc/thumb.jpg",
    src: "/frames/nc/frame.jpg",
    hasOverlay: true,
    overlayVariants: [
      {
        id: "footer",
        label: "Footer",
        src: "/frames/nc/footer.png",
      },
    ],
    defaultOverlayVariantId: "footer",
    exportName: "nc-15th-mahadhibeshan.jpg",
    photo: { widthPct: 35, x: 50, y: 50 },
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
    layoutPresets: NC_LAYOUT_PRESETS,
    defaultLayoutId: NC_LAYOUT.id,
  },
  {
    id: "dhanyabaad",
    label: "धन्यवाद",
    description: "Thank-you frame with selectable धन्यवाद greeting",
    thumb: "/frames/dhanyabad/thumb.jpg",
    src: "/frames/dhanyabad/frame.jpg",
    hasOverlay: true,
    overlayVariants: [
      {
        id: "hardik",
        label: "हार्दिक धन्यवाद",
        src: "/frames/dhanyabad/overlay-hardik.png",
      },
      {
        id: "short",
        label: "धन्यवाद!",
        src: "/frames/dhanyabad/overlay-short.png",
      },
    ],
    defaultOverlayVariantId: "hardik",
    exportName: "dhanyabaad.jpg",
    photo: { widthPct: 40, x: 74, y: 55 },
    map: {
      widthPct: 21.38,
    },
    mapLabel: {
      backgroundColor: "transparent",
      color: "#0A5703",
      fontFamily: "Vespre",
      fontSizePx: 50,
      fontWeight: "700",
      scale: 1,
    },
    nameText: {
      backgroundColor: "transparent",
      color: NC_DEFAULT_COLORS.name,
      fontFamily: "Yatra",
      fontSizePx: 120,
      fontWeight: "700",
      scale: 1,
    },
    roleText: {
      backgroundColor: "transparent",
      color: NC_DEFAULT_COLORS.role,
      fontFamily: "Vespre",
      fontSizePx: 42,
      fontWeight: "600",
      scale: 1,
    },
    layoutPresets: DHANYABAAD_LAYOUT_PRESETS,
    defaultLayoutId: DHANYABAAD_LAYOUT_PRESETS[0].id,
  },
];

export const DEFAULT_FRAME_ID: NcFrameId = "nc15";

export function findNcFrame(id: NcFrameId): NcFrameConfig {
  return NC_FRAMES.find((frame) => frame.id === id) ?? NC_FRAMES[0];
}

export const DEFAULT_LAYOUT_ID: NcLayoutPresetId = NC_LAYOUT.id;
