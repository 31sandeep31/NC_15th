import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";

import { computeContainedRect } from "@/features/poster/lib/canvas";
import { useBackgroundRemoval } from "@/hooks/use-background-removal";
import type { BackgroundRemovalQuality } from "@/lib/bg-removal/client";
import { logError } from "@/lib/logger";

import {
  type DistrictEntry,
  type DistrictShape,
  loadDistrictShape,
  loadDistricts,
} from "../lib/districts";
import { generateNcPoster } from "../lib/export";
import {
  DEFAULT_FRAME_ID,
  findNcFrame,
  NC_DEFAULT_COLORS,
  type NcFrameId,
  type NcLayoutPreset,
  type NcLayoutPresetId,
  type NcPosition,
} from "../lib/frame";
import {
  DEFAULT_TEXT_STYLE,
  type SelectedTextId,
  type TextStyleFlags,
} from "../lib/types";

const TEXT_SCALE_STEP = 0.05;
const MAX_DESIGNATIONS = 5;
const ROLE_LINE_GAP = 1.25;

type Offset = { x: number; y: number };

const ZERO: Offset = { x: 0, y: 0 };

export function useNcBuilder() {
  const [frameId, setFrameId] = useState<NcFrameId>(DEFAULT_FRAME_ID);
  const frame = findNcFrame(frameId);
  const [overlayVariantId, setOverlayVariantId] = useState<string>(
    frame.defaultOverlayVariantId,
  );
  const overlayVariant =
    frame.overlayVariants.find((v) => v.id === overlayVariantId) ??
    frame.overlayVariants[0];

  const [layoutId, setLayoutId] = useState<NcLayoutPresetId>(
    frame.defaultLayoutId,
  );

  const [namePos, setNamePos] = useState<NcPosition>(
    frame.layoutPresets[0].name,
  );
  const [rolePos, setRolePos] = useState<NcPosition>(
    frame.layoutPresets[0].role,
  );
  const [mapPos, setMapPos] = useState<NcPosition>(frame.layoutPresets[0].map);
  const [mapLabelPos, setMapLabelPos] = useState<NcPosition>(
    frame.layoutPresets[0].mapLabel,
  );

  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoSrc, setPhotoSrc] = useState("");
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);

  const [removeBgBusy, setRemoveBgBusy] = useState(false);
  const [removeBgQualityUsed, setRemoveBgQualityUsed] =
    useState<BackgroundRemovalQuality | null>(null);
  const [removeBgMessage, setRemoveBgMessage] = useState("");
  const [removeBgQuality, setRemoveBgQuality] =
    useState<BackgroundRemovalQuality>("standard");

  const [exportBusy, setExportBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [designationLines, setDesignationLines] = useState<string[]>([""]);
  const [designationOffsets, setDesignationOffsets] = useState<Offset[]>([ZERO]);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);

  const [nameScaleAdjust, setNameScaleAdjust] = useState(1);
  const [roleScaleAdjusts, setRoleScaleAdjusts] = useState<number[]>([1]);
  const [nameColor, setNameColor] = useState<string | null>(null);
  const [designationColors, setDesignationColors] = useState<
    (string | null)[]
  >([null]);
  const [nameTextStyle, setNameTextStyle] = useState<TextStyleFlags>({
    ...DEFAULT_TEXT_STYLE,
  });
  const [designationTextStyles, setDesignationTextStyles] = useState<
    TextStyleFlags[]
  >([{ ...DEFAULT_TEXT_STYLE }]);
  const [nameOffset, setNameOffset] = useState<Offset>(ZERO);

  const [district, setDistrict] = useState<DistrictEntry | null>(null);
  const [shape, setShape] = useState<DistrictShape | null>(null);
  const [mapStatus, setMapStatus] = useState<"error" | "idle" | "loading">(
    "idle",
  );
  const [mapOffset, setMapOffset] = useState<Offset>(ZERO);
  const [mapScale, setMapScale] = useState(1);
  const [mapFill, setMapFill] = useState<string>(NC_DEFAULT_COLORS.map);
  const [mapLabel, setMapLabel] = useState("");
  const [mapLabelOffset, setMapLabelOffset] = useState<Offset>(ZERO);
  const [mapLabelScale, setMapLabelScale] = useState(1);
  const [mapLabelColor, setMapLabelColor] = useState<string | null>(null);
  const [mapLabelTextStyle, setMapLabelTextStyle] = useState<TextStyleFlags>({
    ...DEFAULT_TEXT_STYLE,
  });

  const [selectedTextId, setSelectedTextId] = useState<SelectedTextId>(null);

  const currentPhotoUrlRef = useRef<string | null>(null);
  const removeBgRunIdRef = useRef(0);
  const districtRunIdRef = useRef(0);
  const districtsRef = useRef<DistrictEntry[] | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const frameImageRef = useRef<HTMLImageElement>(null);
  const photoImageRef = useRef<HTMLImageElement>(null);
  const nameTextRef = useRef<HTMLDivElement>(null);
  const frameOverlayRef = useRef<HTMLDivElement>(null);
  const photoUploadRef = useRef<HTMLInputElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const activeRoleInputRef = useRef<HTMLInputElement | null>(null);
  const [districts, setDistricts] = useState<DistrictEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadDistricts()
      .then((list) => {
        if (cancelled) return;
        districtsRef.current = list;
        setDistricts(list);
      })
      .catch((error) => {
        logError("nc.districts.manifest_failed", error, { feature: "nc" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateFrameOverlay = useCallback(() => {
    const stage = stageRef.current;
    const frameImage = frameImageRef.current;
    if (!stage || !frameImage) return;
    if (!frameImage.naturalWidth || !frameImage.naturalHeight) return;

    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;

    const rect = computeContainedRect(
      stageRect.width,
      stageRect.height,
      frameImage.naturalWidth,
      frameImage.naturalHeight,
    );

    stage.style.setProperty("--frame-x", `${rect.x}px`);
    stage.style.setProperty("--frame-y", `${rect.y}px`);
    stage.style.setProperty("--frame-w", `${rect.width}px`);
    stage.style.setProperty("--frame-h", `${rect.height}px`);
    stage.style.setProperty("--frame-font-size", `${rect.width / 1080}px`);
  }, []);

  useEffect(() => {
    const frameImage = frameImageRef.current;
    if (!frameImage) return;

    const handleLoad = () => updateFrameOverlay();
    frameImage.addEventListener("load", handleLoad);
    if (frameImage.complete) updateFrameOverlay();

    const stage = stageRef.current;
    let rafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateFrameOverlay();
      });
    });
    if (stage) observer.observe(stage);

    return () => {
      frameImage.removeEventListener("load", handleLoad);
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [updateFrameOverlay]);

  const {
    processedImage,
    isProcessing: isRemoveBgProcessing,
    removeBg: triggerRemoveBg,
    cleanup: cleanupBgRemoval,
  } = useBackgroundRemoval();

  useEffect(() => {
    if (processedImage) setPhotoSrc(processedImage);
  }, [processedImage]);

  useEffect(() => {
    setRemoveBgBusy(isRemoveBgProcessing);
  }, [isRemoveBgProcessing]);

  const onPhotoFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (currentPhotoUrlRef.current) {
        URL.revokeObjectURL(currentPhotoUrlRef.current);
      }

      cleanupBgRemoval();
      const url = URL.createObjectURL(file);
      currentPhotoUrlRef.current = url;

      removeBgRunIdRef.current += 1;
      setPhotoSrc(url);
      setHasPhoto(true);
      setRemoveBgQualityUsed(null);
      setRemoveBgQuality("standard");
      setRemoveBgBusy(false);
      setRemoveBgMessage("");
      setOffsetX(0);
      setOffsetY(0);
      setSelectedTextId("photo");
    },
    [cleanupBgRemoval],
  );

  const clearPhoto = useCallback(() => {
    removeBgRunIdRef.current += 1;
    if (currentPhotoUrlRef.current) {
      URL.revokeObjectURL(currentPhotoUrlRef.current);
      currentPhotoUrlRef.current = null;
    }
    cleanupBgRemoval();
    if (photoUploadRef.current) photoUploadRef.current.value = "";
    setPhotoSrc("");
    setHasPhoto(false);
    setRemoveBgQualityUsed(null);
    setRemoveBgQuality("standard");
    setRemoveBgBusy(false);
    setRemoveBgMessage("");
    setOffsetX(0);
    setOffsetY(0);
  }, [cleanupBgRemoval]);

  const removeBackground = useCallback(
    async (quality: BackgroundRemovalQuality = "standard") => {
      if (!hasPhoto || !photoSrc) return;
      if (removeBgQualityUsed === quality) return;

      removeBgRunIdRef.current += 1;
      const runId = removeBgRunIdRef.current;
      const isHq = quality === "hq";

      setRemoveBgMessage(isHq ? "Downloading HD model..." : "");
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 0);
      });

      try {
        await triggerRemoveBg(photoSrc, quality);
        if (runId !== removeBgRunIdRef.current) return;
        setRemoveBgQualityUsed(quality);
        setRemoveBgMessage(isHq ? "Background removed (HD)" : "Background removed");
      } catch (error) {
        logError("nc.background.remove_failed", error, {
          feature: "nc",
          quality,
        });
        if (runId === removeBgRunIdRef.current) {
          setRemoveBgMessage(
            isHq ? "HD background removal failed." : "Background removal failed.",
          );
        }
      }
    },
    [hasPhoto, photoSrc, removeBgQualityUsed, triggerRemoveBg],
  );

  const selectDistrict = useCallback(async (entry: DistrictEntry) => {
    districtRunIdRef.current += 1;
    const runId = districtRunIdRef.current;
    setDistrict(entry);
    setShape(null);
    setMapStatus("loading");
    setMapLabel(entry.districtNe);
    try {
      const next = await loadDistrictShape(entry);
      if (runId !== districtRunIdRef.current) return;
      setShape(next);
      setMapStatus("idle");
    } catch (error) {
      logError("nc.districts.load_failed", error, {
        feature: "nc",
        district: entry.district,
      });
      if (runId === districtRunIdRef.current) setMapStatus("error");
    }
  }, []);

  const applyPreset = useCallback(
    (preset: NcLayoutPreset) => {
      setLayoutId(preset.id);
      setNamePos(preset.name);
      setRolePos(preset.role);
      setMapPos(preset.map);
      setMapLabelPos(preset.mapLabel);
      setNameOffset(ZERO);
      setMapOffset(ZERO);
      setMapLabelOffset(ZERO);
      setDesignationOffsets(designationLines.map(() => ({ ...ZERO })));
    },
    [designationLines],
  );

  const applyLayout = useCallback(
    (id: NcLayoutPresetId) => {
      const preset = frame.layoutPresets.find((p) => p.id === id);
      if (!preset) return;
      applyPreset(preset);
    },
    [applyPreset, frame],
  );

  const applyFrame = useCallback(
    (id: NcFrameId, nextLayoutId?: NcLayoutPresetId) => {
      const next = findNcFrame(id);
      setFrameId(id);
      setOverlayVariantId(next.defaultOverlayVariantId);
      const preset =
        next.layoutPresets.find(
          (p) => p.id === (nextLayoutId ?? next.defaultLayoutId),
        ) ?? next.layoutPresets[0];
      if (preset) applyPreset(preset);
    },
    [applyPreset],
  );

  const clearAll = useCallback(() => {
    if (currentPhotoUrlRef.current) {
      URL.revokeObjectURL(currentPhotoUrlRef.current);
      currentPhotoUrlRef.current = null;
    }
    if (photoUploadRef.current) photoUploadRef.current.value = "";
    removeBgRunIdRef.current += 1;
    districtRunIdRef.current += 1;

    const preset =
      frame.layoutPresets.find((p) => p.id === frame.defaultLayoutId) ??
      frame.layoutPresets[0];
    setLayoutId(preset.id);
    setNamePos(preset.name);
    setRolePos(preset.role);
    setMapPos(preset.map);
    setMapLabelPos(preset.mapLabel);

    setPhotoSrc("");
    setHasPhoto(false);
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
    setRemoveBgQualityUsed(null);
    setRemoveBgQuality("standard");
    setRemoveBgBusy(false);
    setRemoveBgMessage("");

    setFullName("");
    setDesignationLines([""]);
    setDesignationOffsets([ZERO]);
    setActiveRoleIndex(0);
    setNameScaleAdjust(1);
    setRoleScaleAdjusts([1]);
    setNameColor(null);
    setDesignationColors([null]);
    setNameTextStyle({ ...DEFAULT_TEXT_STYLE });
    setDesignationTextStyles([{ ...DEFAULT_TEXT_STYLE }]);
    setNameOffset(ZERO);

    setDistrict(null);
    setShape(null);
    setMapStatus("idle");
    setMapOffset(ZERO);
    setMapScale(1);
    setMapFill(NC_DEFAULT_COLORS.map);
    setMapLabel("");
    setMapLabelOffset(ZERO);
    setMapLabelScale(1);
    setMapLabelColor(null);
    setMapLabelTextStyle({ ...DEFAULT_TEXT_STYLE });

    setSelectedTextId(null);
  }, [frame]);

  const addDesignation = useCallback(() => {
    if (designationLines.length >= MAX_DESIGNATIONS) return;
    const newIndex = designationLines.length;
    setDesignationLines((prev) => [...prev, ""]);
    setDesignationOffsets((prev) => [...prev, { ...ZERO }]);
    setRoleScaleAdjusts((prev) => [...prev, 1]);
    setDesignationColors((prev) => [...prev, null]);
    setDesignationTextStyles((prev) => [...prev, { ...DEFAULT_TEXT_STYLE }]);
    setActiveRoleIndex(newIndex);
    setSelectedTextId(newIndex);
  }, [designationLines.length]);

  const clampDragDelta = useCallback(
    (target: HTMLElement, dx: number, dy: number) => {
      const overlay = frameOverlayRef.current;
      if (!overlay) return { dx, dy };
      const frameRect = overlay.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const minDx = frameRect.left - targetRect.left;
      const maxDx = frameRect.right - targetRect.right;
      const minDy = frameRect.top - targetRect.top;
      const maxDy = frameRect.bottom - targetRect.bottom;
      return {
        dx: Math.min(Math.max(dx, minDx), maxDx),
        dy: Math.min(Math.max(dy, minDy), maxDy),
      };
    },
    [],
  );

  const onDrag = useCallback(
    (id: SelectedTextId, dx: number, dy: number) => {
      switch (id) {
        case "map":
          setMapOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          return;
        case "mapLabel":
          setMapLabelOffset((prev) => ({
            x: prev.x + dx / mapScale,
            y: prev.y + dy / mapScale,
          }));
          return;
        case "name":
          setNameOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          return;
        case "photo":
          setOffsetX((prev) => prev + dx);
          setOffsetY((prev) => prev + dy);
          return;
        default:
          if (typeof id === "number") {
            const index = id;
            setDesignationOffsets((prev) =>
              prev.map((o, i) =>
                i === index ? { x: o.x + dx, y: o.y + dy } : o,
              ),
            );
          }
      }
    },
    [mapScale],
  );

  const adjustScale = useCallback((id: SelectedTextId, direction: number) => {
    const step = direction * TEXT_SCALE_STEP;
    switch (id) {
      case "map":
        setMapScale((prev) => Number((prev + step).toFixed(2)));
        return;
      case "mapLabel":
        setMapLabelScale((prev) => Number((prev + step).toFixed(2)));
        return;
      case "name":
        setNameScaleAdjust((prev) => Number((prev + step).toFixed(2)));
        return;
      default:
        if (typeof id === "number") {
          const index = id;
          setRoleScaleAdjusts((prev) =>
            prev.map((s, i) =>
              i === index ? Number((s + step).toFixed(2)) : s,
            ),
          );
        }
    }
  }, []);

  const setScaleValue = useCallback((id: SelectedTextId, value: number) => {
    const safe = Number(Math.max(0.1, Math.min(5, value)).toFixed(2));
    switch (id) {
      case "map":
        setMapScale(safe);
        return;
      case "mapLabel":
        setMapLabelScale(safe);
        return;
      case "name":
        setNameScaleAdjust(safe);
        return;
      case "photo":
        setScale(safe);
        return;
      default:
        if (typeof id === "number") {
          const index = id;
          setRoleScaleAdjusts((prev) =>
            prev.map((s, i) => (i === index ? safe : s)),
          );
        }
    }
  }, []);

  const getScaleValue = useCallback((id: SelectedTextId): number => {
    switch (id) {
      case "map":
        return mapScale;
      case "mapLabel":
        return mapLabelScale;
      case "name":
        return nameScaleAdjust;
      case "photo":
        return scale;
      default:
        if (typeof id === "number") return roleScaleAdjusts[id] ?? 1;
        return 1;
    }
  }, [mapScale, mapLabelScale, nameScaleAdjust, roleScaleAdjusts, scale]);

  const nameTransformStyle = useMemo(() => {
    const { nameText } = frame;
    const parts = [
      `left: ${namePos.x}%`,
      `top: ${namePos.y}%`,
      `color: ${nameColor ?? nameText.color}`,
      `font-family: ${nameText.fontFamily}`,
      `font-size: calc(${nameText.fontSizePx} * 1em)`,
      `font-weight: ${nameTextStyle.bold ? "700" : nameText.fontWeight}`,
      `background-color: ${nameText.backgroundColor}`,
      "transform-origin: left top",
      `transform: translate(${nameOffset.x}px, ${nameOffset.y}px) scale(${nameText.scale * nameScaleAdjust})`,
    ];
    if (nameTextStyle.italic) parts.push("font-style: italic");
    return parts.join("; ");
  }, [nameColor, nameOffset, namePos, nameScaleAdjust, nameTextStyle, frame]);

  const getRoleTransformStyle = useCallback(
    (index: number) => {
      const { roleText } = frame;
      const offsets = designationOffsets[index] ?? ZERO;
      const itemScale = roleScaleAdjusts[index] ?? 1;
      const itemStyle = designationTextStyles[index] ?? DEFAULT_TEXT_STYLE;
      const color = designationColors[index] ?? roleText.color;
      const stackGap = (index * ROLE_LINE_GAP).toFixed(2);
      const parts = [
        `left: ${rolePos.x}%`,
        `top: ${rolePos.y}%`,
        `color: ${color}`,
        `font-family: ${roleText.fontFamily}`,
        `font-size: calc(${roleText.fontSizePx} * 1em)`,
        `font-weight: ${itemStyle.bold ? "700" : roleText.fontWeight}`,
        `background-color: ${roleText.backgroundColor}`,
        "transform-origin: left top",
        `transform: translate(${offsets.x}px, calc(${offsets.y}px + ${stackGap}em)) scale(${roleText.scale * itemScale})`,
      ];
      if (itemStyle.italic) parts.push("font-style: italic");
      return parts.join("; ");
    },
    [
      designationColors,
      designationOffsets,
        designationTextStyles,
        rolePos,
        roleScaleAdjusts,
        frame,
      ],
  );

  const mapTransformStyle = useMemo(() => {
    return [
      `left: ${mapPos.x}%`,
      `top: ${mapPos.y}%`,
      `width: ${frame.map.widthPct}%`,
      "transform-origin: left top",
      `transform: translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapScale})`,
    ].join("; ");
  }, [mapOffset, mapPos, mapScale, frame.map.widthPct]);

  const mapLabelTransformStyle = useMemo(() => {
    const { mapLabel: cfg } = frame;
    const parts = [
      `left: ${mapLabelPos.x}%`,
      `top: ${mapLabelPos.y}%`,
      `color: ${mapLabelColor ?? cfg.color}`,
      `font-family: ${cfg.fontFamily}`,
      `font-size: calc(${cfg.fontSizePx} * 1em)`,
      `font-weight: ${mapLabelTextStyle.bold ? "700" : cfg.fontWeight}`,
      "transform-origin: center",
      `transform: translate(-50%, -50%) translate(${mapLabelOffset.x}px, ${mapLabelOffset.y}px) scale(${cfg.scale * mapLabelScale})`,
    ];
    if (mapLabelTextStyle.italic) parts.push("font-style: italic");
    return parts.join("; ");
  }, [
    mapLabelColor,
    mapLabelOffset,
    mapLabelPos,
    mapLabelScale,
    mapLabelTextStyle,
    frame,
  ]);

  const exportPoster = useCallback(async () => {
    const stage = stageRef.current;
    const frameImage = frameImageRef.current;
    if (!stage || !frameImage) {
      logError("nc.export.missing_elements", undefined, { feature: "nc" });
      sileo.error({
        description: "Poster isn’t ready yet. Please try again.",
        title: "Export Unavailable",
      });
      return;
    }

    const nameEl = nameTextRef.current;
    const mapEl = document.getElementById("ncMap");

    setExportBusy(true);
    try {
      const designations = designationLines.flatMap((text, index) => {
        const el = document.getElementById(`ncRoleText-${index}`);
        if (!el || !text.trim()) return [];
        return [
          {
            color: designationColors[index] ?? undefined,
            el,
            scale:
              frame.roleText.scale * (roleScaleAdjusts[index] ?? 1),
            text,
          },
        ];
      });

      const mapLabelEl = document.getElementById("ncMapLabel");

      await generateNcPoster({
        designations,
        exportName: frame.exportName,
        footerSrc: frame.footerSrc,
        frameImage,
        hasOverlay: frame.hasOverlay,
        hasPhoto,
        map:
          shape && mapEl
            ? { el: mapEl, fill: mapFill, shape }
            : undefined,
        mapLabel:
          mapLabelEl && mapLabel.trim()
            ? {
                align: "center",
                color: mapLabelColor ?? undefined,
                el: mapLabelEl,
                scale:
                  frame.mapLabel.scale * mapLabelScale * mapScale,
                text: mapLabel,
              }
            : undefined,
        name:
          nameEl && fullName.trim()
            ? {
                color: nameColor ?? undefined,
                el: nameEl,
                scale: frame.nameText.scale * nameScaleAdjust,
                text: fullName,
              }
            : undefined,
        overlaySrc: overlayVariant.src,
        photoImage: photoImageRef.current ?? undefined,
        photoSrc,
        stage,
      });
    } catch (error) {
      logError("nc.export.failed", error, { feature: "nc" });
      sileo.error({
        description: "Couldn’t generate the poster image. Please try again.",
        title: "Export Failed",
      });
    } finally {
      setExportBusy(false);
    }
  }, [
    designationColors,
    designationLines,
    frame,
    fullName,
    hasPhoto,
    mapFill,
    mapLabel,
    mapLabelColor,
    mapLabelScale,
    mapScale,
    nameColor,
    nameScaleAdjust,
    overlayVariant,
    photoSrc,
    roleScaleAdjusts,
    shape,
  ]);

  const groupedDistricts = useMemo(() => {
    const groups = new Map<string, DistrictEntry[]>();
    for (const entry of districts) {
      const list = groups.get(entry.province);
      if (list) list.push(entry);
      else groups.set(entry.province, [entry]);
    }
    return [...groups.entries()].map(([province, list]) => ({
      label: list[0]?.provinceNe ?? province,
      list,
      province,
    }));
  }, [districts]);

  return {
    activeRoleInputRef,
    addDesignation,
    adjustScale,
    clearAll,
    clearPhoto,
    clampDragDelta,
    designationColors,
    designationLines,
    designationOffsets,
    designationTextStyles,
    district,
    districts,
    exportBusy,
    exportPoster,
    frame,
    frameId,
    frameImageRef,
    frameOverlayRef,
    fullName,
    fullNameInputRef,
    getRoleTransformStyle,
    getScaleValue,
    groupedDistricts,
    hasPhoto,
    layoutId,
    layoutPresets: frame.layoutPresets,
    mapFill,
    mapLabel,
    mapLabelColor,
    mapLabelPos,
    mapLabelScale,
    mapLabelTextStyle,
    mapLabelTransformStyle,
    mapOffset,
    mapPos,
    mapScale,
    mapStatus,
    mapTransformStyle,
    maxDesignations: MAX_DESIGNATIONS,
    nameColor,
    nameOffset,
    namePos,
    nameScaleAdjust,
    nameTextRef,
    nameTextStyle,
    nameTransformStyle,
    onDrag,
    onPhotoFileChange,
    offsetX,
    offsetY,
    activeRoleIndex,
    applyFrame,
    applyLayout,
    overlayVariant,
    overlayVariantId,
    photoImageRef,
    photoSrc,
    photoUploadRef,
    removeBackground,
    removeBgBusy,
    removeBgMessage,
    removeBgQuality,
    roleScaleAdjusts,
    scale,
    selectDistrict,
    selectedTextId,
    setActiveRoleIndex,
    setDesignationColors,
    setDesignationLines,
    setDesignationOffsets,
    setDesignationTextStyles,
    setFullName,
    setMapFill,
    setMapLabel,
    setMapLabelColor,
    setMapLabelScale,
    setMapLabelTextStyle,
    setNameColor,
    setNameTextStyle,
    setOverlayVariantId,
    setRemoveBgQuality,
    setSelectedTextId,
    setScaleValue,
    setRoleScaleAdjusts,
    shape,
    stageRef,
    updateFrameOverlay,
  };
}
