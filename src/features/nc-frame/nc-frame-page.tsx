import {
  Bold,
  ChevronDown,
  Download,
  Italic,
  Minus,
  Move,
  Plus,
  PlusCircleIcon,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { usePinch } from "@/hooks/use-pinch";
import { cn } from "@/lib/utils";

import { TranslitInput } from "./components/translit-input";
import { useNcBuilder } from "./hooks/use-nc-builder";
import { useNcDrag } from "./hooks/use-nc-drag";
import type { DistrictEntry } from "./lib/districts";
import {
  NC_FRAME,
  NC_LAYOUT_PRESETS,
  type NcLayoutPresetId,
} from "./lib/frame";
import {
  DEFAULT_TEXT_STYLE,
  type SelectedTextId,
  type TextStyleFlags,
} from "./lib/types";

const COLOR_SWATCHES = [
  "#000000",
  "#ffffff",
  "#292525",
  "#0A5703",
  "#094E02",
  "#16a34a",
  "#22c55e",
  "#84cc16",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#0ea5e9",
  "#7c3aed",
];

type PreviewPresetId = NcLayoutPresetId;

const PREVIEW_DEMO: Record<
  PreviewPresetId,
  { district: string; label: string; name: string; roles: string[] }
> = {
  "text-left": {
    district: "Chitawan",
    label: "चितवन",
    name: "गगन थाप",
    roles: ["प्रदेश प्रतिनिधि उम्मेदवार"],
  },
  "text-right": {
    district: "Rupandehi",
    label: "रुपन्देही क्षेत्र नं. २",
    name: "गगन थाप",
    roles: ["महाधिवेशन प्रतिनिधि उम्मेदवार", "(खुला तर्फ)"],
  },
};

// `?preview=text-left|text-right` renders a bare frame without any panels so
// the layout thumbnails can be regenerated from the live renderer.
function readPreviewPreset(): PreviewPresetId | null {
  const value = new URLSearchParams(window.location.search).get("preview");
  if (value === "text-left" || value === "text-right") return value;
  return null;
}

export function NcFramePage() {
  const nc = useNcBuilder();
  const [previewPreset] = useState<PreviewPresetId | null>(readPreviewPreset);
  const previewReadyRef = useRef(false);

  useEffect(() => {
    if (!previewPreset || previewReadyRef.current) return;
    if (nc.districts.length === 0) return;
    previewReadyRef.current = true;

    const demo = PREVIEW_DEMO[previewPreset];
    nc.applyLayout(previewPreset);
    nc.setFullName(demo.name);
    nc.setDesignationLines([...demo.roles]);
    nc.setDesignationOffsets(demo.roles.map(() => ({ x: 0, y: 0 })));
    nc.setRoleScaleAdjusts(demo.roles.map(() => 1));
    nc.setDesignationColors(demo.roles.map(() => null));
    nc.setDesignationTextStyles(
      demo.roles.map(() => ({ ...DEFAULT_TEXT_STYLE })),
    );
    nc.setMapLabel(demo.label);
    const entry = nc.districts.find((d) => d.district === demo.district);
    if (entry) void nc.selectDistrict(entry);
  }, [nc, previewPreset]);

  const drag = useNcDrag({
    clamp: true,
    clampDragDelta: nc.clampDragDelta,
    onDrag: nc.onDrag,
    onDragEnd: () => {},
  });

  const selected = nc.selectedTextId;
  const currentScale = nc.getScaleValue(selected);
  const handleScale = useCallback(
    (value: number) => nc.setScaleValue(selected, value),
    [nc, selected],
  );
  const pinch = usePinch(currentScale, handleScale, selected !== null);

  useEffect(() => {
    const existing = document.querySelector(
      `link[rel="preload"][data-nc-frame-preload]`,
    );
    if (existing) existing.remove();
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = NC_FRAME.src;
    link.dataset.ncFramePreload = "1";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  const photoDragProps = drag.getDragProps("photo", { clamp: false });
  const nameDragProps = drag.getDragProps("name");
  const mapDragProps = drag.getDragProps("map");
  const mapLabelDragProps = drag.getDragProps("mapLabel");
  const roleDragProps = nc.designationLines.map((_, index) =>
    drag.getDragProps(index),
  );

  const handleDistrictChange = useCallback(
    (value: string) => {
      const entry = nc.districts.find((d) => d.district === value);
      if (entry) void nc.selectDistrict(entry);
    },
    [nc],
  );

  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [districtQuery, setDistrictQuery] = useState("");

  const handleProvinceChange = useCallback((value: string) => {
    setProvinceFilter(value === "__all" ? null : value);
    setDistrictQuery("");
  }, []);

  const provinceGroups = useMemo(() => {
    if (provinceFilter === null) return nc.groupedDistricts;
    return nc.groupedDistricts.filter(
      (group) => group.province === provinceFilter,
    );
  }, [nc.groupedDistricts, provinceFilter]);

  const districtSearchResults = useMemo(() => {
    const query = districtQuery.trim();
    if (!query) return [] as DistrictEntry[];
    const lower = query.toLowerCase();
    return nc.districts
      .filter(
        (entry) =>
          entry.districtNe.includes(query) ||
          entry.district.toLowerCase().includes(lower),
      )
      .slice(0, 8);
  }, [districtQuery, nc.districts]);

  const pickDistrict = useCallback(
    (entry: DistrictEntry) => {
      void nc.selectDistrict(entry);
      setDistrictQuery("");
      setProvinceFilter(entry.province);
    },
    [nc],
  );

  const isPreview = previewPreset !== null;

  return (
    <main
      className={
        isPreview
          ? "fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white"
          : "flex-1 overflow-auto p-3 sm:p-4 lg:p-6"
      }
    >
      <section
        className={
          isPreview
            ? "flex h-full w-full items-center justify-center"
            : "mx-auto flex max-w-7xl flex-col gap-3 lg:grid lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(200px,300px)] lg:items-start lg:gap-5"
        }
      >
        {/* Left Panel - Controls */}
        <div
          className={
            isPreview
              ? "hidden"
              : "order-3 max-w-full rounded-lg border bg-card p-3 shadow-sm sm:p-4 lg:order-1 lg:p-5"
          }
        >
          <div className="flex flex-col gap-3 lg:gap-5">
            <div className="hidden items-center justify-between lg:flex">
              <h2 className="font-medium text-sm">Controls</h2>
              <Button
                className="h-7 gap-1 px-2 text-muted-foreground text-xs"
                onClick={nc.clearAll}
                size="sm"
                variant="ghost"
              >
                <RotateCcw className="size-3" />
                Reset
              </Button>
            </div>

            {/* Upload Photo */}
            <div>
              <Label className="mb-2 hidden lg:block">Upload Your Photo</Label>
              <input
                accept="image/*"
                className="hidden"
                onChange={nc.onPhotoFileChange}
                ref={nc.photoUploadRef}
                type="file"
              />

              {!nc.hasPhoto && (
                <Button
                  className="w-full lg:hidden"
                  onClick={() => nc.photoUploadRef.current?.click()}
                  variant="outline"
                >
                  <Upload className="size-4" />
                  Upload Your Photo
                </Button>
              )}

              <div className="group relative mt-2 hidden lg:block">
                <button
                  className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-md border border-border border-dashed bg-muted/50 p-4 text-muted-foreground transition hover:border-primary/50 hover:bg-muted"
                  onClick={() => nc.photoUploadRef.current?.click()}
                  type="button"
                >
                  {nc.hasPhoto ? (
                    <img
                      alt="Upload preview"
                      className="absolute inset-0 h-full w-full object-cover"
                      src={nc.photoSrc}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                        <Plus className="size-4 text-muted-foreground" />
                      </div>
                      <span className="font-semibold text-xs uppercase tracking-widest">
                        Upload Photo
                      </span>
                      <span className="text-muted-foreground text-xs">
                        PNG or JPG
                      </span>
                    </div>
                  )}
                </button>
                {nc.hasPhoto && (
                  <button
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 text-foreground opacity-0 shadow-sm transition group-hover:opacity-100"
                    onClick={nc.clearPhoto}
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Province + District */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ncProvince">प्रदेश (Province)</Label>
                <Select
                  onValueChange={handleProvinceChange}
                  value={provinceFilter ?? "__all"}
                >
                  <SelectTrigger id="ncProvince">
                    {provinceFilter === null ? (
                      <span className="text-muted-foreground">
                        सबै प्रदेश
                      </span>
                    ) : (
                      <span>
                        {nc.groupedDistricts.find(
                          (group) => group.province === provinceFilter,
                        )?.label ?? provinceFilter}
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">सबै प्रदेश</SelectItem>
                    {nc.groupedDistricts.map((group) => (
                      <SelectItem
                        key={group.province}
                        value={group.province}
                      >
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ncDistrict">District Map</Label>
                <Select
                  onValueChange={handleDistrictChange}
                  value={nc.district?.district ?? ""}
                >
                  <SelectTrigger id="ncDistrict">
                    {nc.district ? (
                      <span>{`${nc.district.districtNe} · ${nc.district.district}`}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Select district
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {provinceGroups.map((group) => (
                      <SelectGroup key={group.province}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.list.map((entry) => (
                          <SelectItem
                            key={entry.district}
                            value={entry.district}
                          >
                            {`${entry.districtNe} · ${entry.district}`}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  className="leading-normal"
                  htmlFor="ncDistrictSearch"
                >
                  जिल्ला खोज्नुहोस्
                </Label>
                <Input
                  autoComplete="off"
                  id="ncDistrictSearch"
                  onChange={(event) => setDistrictQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    const first = districtSearchResults[0];
                    if (!first) return;
                    event.preventDefault();
                    pickDistrict(first);
                  }}
                  placeholder="Type a district name…"
                  value={districtQuery}
                />
                {districtSearchResults.length > 0 && (
                  <ul className="max-h-40 overflow-auto rounded-md border bg-popover shadow-sm">
                    {districtSearchResults.map((entry) => (
                      <li key={entry.district}>
                        <button
                          className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => pickDistrict(entry)}
                          type="button"
                        >
                          <span>{entry.districtNe}</span>
                          <span className="text-muted-foreground text-xs">
                            {entry.district}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {nc.mapStatus === "loading" && (
                <span className="text-muted-foreground text-xs">
                  Loading map…
                </span>
              )}
              {nc.mapStatus === "error" && (
                <span className="text-destructive text-xs">
                  Couldn’t load that map. Try another district.
                </span>
              )}
            </div>

            {/* Map label */}
            <div
              className={cn(
                "flex-col gap-1.5",
                nc.shape ? "flex" : "hidden lg:flex",
              )}
            >
              <Label htmlFor="ncMapLabelInput">Map Label</Label>
              <TranslitInput
                id="ncMapLabelInput"
                listboxId="nc-map-label-suggestions"
                onChange={nc.setMapLabel}
                onFocus={() => nc.setSelectedTextId("mapLabel")}
                placeholder="e.g. रुपन्देही क्षेत्र नं. २"
                value={nc.mapLabel}
              />
            </div>

            {/* Name + Designation */}
            <div
              className={cn(
                "flex flex-col gap-3 lg:gap-4",
                !nc.hasPhoto && "hidden lg:flex",
              )}
            >
              <div className="flex flex-col gap-1.5">
                <Label className="hidden lg:block" htmlFor="ncFullName">
                  Full Name
                </Label>
                <TranslitInput
                  id="ncFullName"
                  listboxId="nc-name-suggestions"
                  onChange={nc.setFullName}
                  onFocus={() => nc.setSelectedTextId("name")}
                  placeholder="Full Name"
                  value={nc.fullName}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="hidden lg:block">Designation</Label>
                <div className="flex flex-col gap-2">
                  {nc.designationLines.map((line, index) => (
                    <TranslitInput
                      key={`nc-role-${index.toString()}`}
                      listboxId={`nc-role-suggestions-${index}`}
                      onChange={(value) => {
                        nc.setDesignationLines((prev) =>
                          prev.map((item, i) =>
                            i === index ? value : item,
                          ),
                        );
                      }}
                      onFocus={() => {
                        nc.setActiveRoleIndex(index);
                        nc.setSelectedTextId(index);
                      }}
                      placeholder={`Designation ${index + 1}`}
                      value={line}
                    />
                  ))}
                  <Button
                    className="rounded-none p-0 outline-dotted outline-1 outline-primary"
                    disabled={
                      nc.designationLines.length >= nc.maxDesignations
                    }
                    onClick={nc.addDesignation}
                    size="sm"
                    variant="ghost"
                  >
                    <PlusCircleIcon className="size-4" /> Add Designation
                  </Button>
                </div>
              </div>
            </div>

            {/* Export */}
            <div
              className={cn(
                "flex flex-col gap-2",
                !nc.hasPhoto && "hidden lg:flex",
              )}
            >
              <Button disabled={nc.exportBusy} onClick={nc.exportPoster} variant="outline">
                <Download className="size-4" />
                {nc.exportBusy ? "Downloading..." : "Download Image"}
              </Button>
            </div>
          </div>
        </div>

        {/* Center - Stage + Toolbar */}
        <div
          className={
            isPreview
              ? "flex h-full w-full items-center justify-center"
              : "order-2 flex flex-col items-center gap-2 lg:order-2"
          }
        >
          <div
            className={
              isPreview
                ? "relative aspect-[4/5] h-full overflow-hidden"
                : "relative aspect-[4/5] w-full max-w-full overflow-hidden rounded-md border shadow-lg lg:max-w-[600px]"
            }
            id="stage"
            data-preview={previewPreset ?? ""}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) nc.setSelectedTextId(null);
            }}
            ref={nc.stageRef}
          >
            <img
              alt="NC 15th Mahadhibeshan frame"
              className="absolute inset-0 h-full w-full object-contain"
              onPointerDown={() => nc.setSelectedTextId(null)}
              ref={nc.frameImageRef}
              src={NC_FRAME.src}
            />

            {nc.hasPhoto && nc.photoSrc && (
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 left-1/2 w-[35%] touch-none select-none",
                  nc.selectedTextId === "photo" && "z-10",
                )}
                id="ncPhotoElement"
                style={{
                  transform: `translate(-50%, -50%) translate(${nc.offsetX}px, ${nc.offsetY}px) scale(${nc.scale})`,
                }}
              >
                <img
                  alt="Uploaded portrait"
                  className="block w-full touch-none select-none"
                  draggable={false}
                  ref={nc.photoImageRef}
                  src={nc.photoSrc}
                />

                <div
                  className="pointer-events-auto absolute top-1/2 left-1/2 z-40 flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-background/90 text-foreground opacity-80 shadow-md backdrop-blur-md transition-opacity hover:opacity-100"
                  onPointerCancel={photoDragProps.onPointerCancel}
                  onPointerDown={photoDragProps.onPointerDown}
                  onPointerLeave={photoDragProps.onPointerUp}
                  onPointerMove={photoDragProps.onPointerMove}
                  onPointerUp={(e) => {
                    photoDragProps.onPointerUp(e);
                    nc.setSelectedTextId("photo");
                  }}
                  onTouchEnd={
                    nc.selectedTextId === "photo"
                      ? pinch.onTouchEnd
                      : undefined
                  }
                  onTouchMove={
                    nc.selectedTextId === "photo"
                      ? pinch.onTouchMove
                      : undefined
                  }
                  onTouchStart={
                    nc.selectedTextId === "photo"
                      ? pinch.onTouchStart
                      : undefined
                  }
                  title="Drag to move photo"
                >
                  <Move className="size-5" />
                </div>

                <Handles
                  elementId="ncPhotoElement"
                  isActive={nc.selectedTextId === "photo"}
                  onChange={handleScale}
                  value={nc.scale}
                  visualScale={nc.scale}
                />
                {nc.removeBgBusy && (
                  <div
                    className={cn(
                      "photo-processing-wrap",
                      nc.removeBgBusy && "is-active",
                    )}
                  >
                    <div className="photo-processing-overlay" />
                    <div className="photo-processing-sheen" />
                  </div>
                )}
              </div>
            )}

            <img
              alt="Frame footer"
              className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
              src={NC_FRAME.overlaySrc}
            />

            <div
              className="pointer-events-none absolute z-30"
              id="frameOverlay"
              ref={nc.frameOverlayRef}
              style={{
                height: "var(--frame-h, 100%)",
                left: "var(--frame-x, 0px)",
                top: "var(--frame-y, 0px)",
                width: "var(--frame-w, 100%)",
              }}
            >
              <div className="absolute inset-0 text-foreground">
                {nc.fullName.trim().length > 0 && (
                  <div
                    className={cn(
                      "pointer-events-auto absolute w-fit cursor-grab touch-none select-none py-1",
                      nc.selectedTextId === "name" && "z-10",
                    )}
                    id="ncNameText"
                    onPointerCancel={nameDragProps.onPointerCancel}
                    onPointerDown={nameDragProps.onPointerDown}
                    onPointerLeave={nameDragProps.onPointerUp}
                    onPointerMove={nameDragProps.onPointerMove}
                    onPointerUp={(e) => {
                      nameDragProps.onPointerUp(e);
                      nc.setSelectedTextId("name");
                    }}
                    onTouchEnd={
                      nc.selectedTextId === "name"
                        ? pinch.onTouchEnd
                        : undefined
                    }
                    onTouchMove={
                      nc.selectedTextId === "name"
                        ? pinch.onTouchMove
                        : undefined
                    }
                    onTouchStart={
                      nc.selectedTextId === "name"
                        ? pinch.onTouchStart
                        : undefined
                    }
                    ref={nc.nameTextRef}
                    style={cssStringToObject(nc.nameTransformStyle)}
                  >
                    {nc.fullName}
                    <Handles
                      elementId="ncNameText"
                      isActive={nc.selectedTextId === "name"}
                      onChange={handleScale}
                      value={nc.nameScaleAdjust}
                      visualScale={
                        NC_FRAME.nameText.scale * nc.nameScaleAdjust
                      }
                    />
                  </div>
                )}

                {nc.designationLines.map((line, index) =>
                  line.trim().length > 0 ? (
                    <div
                      className={cn(
                        "designation-primary pointer-events-auto absolute w-fit cursor-grab touch-none select-none p-1",
                        nc.selectedTextId === index && "z-10",
                      )}
                      id={`ncRoleText-${index}`}
                      key={`nc-role-text-${index.toString()}`}
                      onPointerCancel={
                        roleDragProps[index].onPointerCancel
                      }
                      onPointerDown={roleDragProps[index].onPointerDown}
                      onPointerLeave={roleDragProps[index].onPointerUp}
                      onPointerMove={roleDragProps[index].onPointerMove}
                      onPointerUp={(e) => {
                        roleDragProps[index].onPointerUp(e);
                        nc.setSelectedTextId(index);
                      }}
                      onTouchEnd={
                        nc.selectedTextId === index
                          ? pinch.onTouchEnd
                          : undefined
                      }
                      onTouchMove={
                        nc.selectedTextId === index
                          ? pinch.onTouchMove
                          : undefined
                      }
                      onTouchStart={
                        nc.selectedTextId === index
                          ? pinch.onTouchStart
                          : undefined
                      }
                      style={cssStringToObject(
                        nc.getRoleTransformStyle(index),
                      )}
                    >
                      {line}
                      <Handles
                        elementId={`ncRoleText-${index}`}
                        isActive={nc.selectedTextId === index}
                        onChange={handleScale}
                        value={nc.roleScaleAdjusts[index] ?? 1}
                        visualScale={
                          NC_FRAME.roleText.scale *
                          (nc.roleScaleAdjusts[index] ?? 1)
                        }
                      />
                    </div>
                  ) : null,
                )}

                {nc.shape && (
                  <div
                    className={cn(
                      "pointer-events-auto absolute cursor-grab touch-none select-none",
                      nc.selectedTextId === "map" && "z-10",
                    )}
                    id="ncMap"
                    onPointerCancel={mapDragProps.onPointerCancel}
                    onPointerDown={mapDragProps.onPointerDown}
                    onPointerLeave={mapDragProps.onPointerUp}
                    onPointerMove={mapDragProps.onPointerMove}
                    onPointerUp={(e) => {
                      mapDragProps.onPointerUp(e);
                      nc.setSelectedTextId("map");
                    }}
                    style={cssStringToObject(nc.mapTransformStyle)}
                  >
                    <svg
                      aria-label={`${nc.district?.district ?? "District"} map`}
                      className="block h-auto w-full"
                      role="img"
                      viewBox={`0 0 ${nc.shape.width} ${nc.shape.height}`}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d={nc.shape.d}
                        fill={nc.mapFill}
                        fillRule="evenodd"
                      />
                    </svg>

                    {nc.mapLabel.trim().length > 0 && (
                      <div
                        className={cn(
                          "absolute w-fit cursor-grab touch-none select-none whitespace-pre-line text-center",
                          nc.selectedTextId === "mapLabel" && "z-20",
                        )}
                        id="ncMapLabel"
                        onPointerCancel={mapLabelDragProps.onPointerCancel}
                        onPointerDown={mapLabelDragProps.onPointerDown}
                        onPointerLeave={mapLabelDragProps.onPointerUp}
                        onPointerMove={mapLabelDragProps.onPointerMove}
                        onPointerUp={(e) => {
                          mapLabelDragProps.onPointerUp(e);
                          nc.setSelectedTextId("mapLabel");
                        }}
                        style={cssStringToObject(nc.mapLabelTransformStyle)}
                      >
                        {nc.mapLabel}
                        <Handles
                          elementId="ncMapLabel"
                          isActive={nc.selectedTextId === "mapLabel"}
                          onChange={handleScale}
                          value={nc.mapLabelScale}
                          visualScale={nc.mapLabelScale * nc.mapScale}
                        />
                      </div>
                    )}

                    <Handles
                      elementId="ncMap"
                      isActive={nc.selectedTextId === "map"}
                      onChange={handleScale}
                      value={nc.mapScale}
                      visualScale={nc.mapScale}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={isPreview ? "hidden" : "hidden lg:block"}>
            <Toolbar
              nc={nc}
              onClose={() => nc.setSelectedTextId(null)}
              selectedTextId={nc.selectedTextId}
            />
          </div>

          <div className={isPreview ? "hidden" : "sticky bottom-2 z-40 lg:hidden"}>
            <Toolbar
              nc={nc}
              onClose={() => nc.setSelectedTextId(null)}
              selectedTextId={nc.selectedTextId}
            />
          </div>
        </div>

        {/* Right Panel - Layouts */}
        <div
          className={
            isPreview
              ? "hidden"
              : "order-1 max-w-full overflow-hidden rounded-lg border bg-card p-3 shadow-sm sm:p-4 lg:order-3 lg:p-5"
          }
        >
          <h2 className="mb-2 hidden font-medium text-sm lg:block">
            Layout
          </h2>
          <div className="flex flex-col gap-2">
            {NC_LAYOUT_PRESETS.map((preset) => (
              <button
                className={cn(
                  "overflow-hidden rounded-md border text-left transition hover:-translate-y-0.5 hover:shadow-md",
                  nc.layoutId === preset.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border",
                )}
                key={preset.id}
                onClick={() => nc.applyLayout(preset.id)}
                type="button"
              >
                <img
                  alt={preset.label}
                  className="h-24 w-full bg-muted/50 object-cover sm:h-32"
                  loading="lazy"
                  src={preset.preview}
                />
                <div className="p-2">
                  <div className="font-medium text-sm">{preset.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {preset.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type NcReturn = ReturnType<typeof useNcBuilder>;

function Toolbar({
  nc,
  selectedTextId,
  onClose,
}: {
  nc: NcReturn;
  selectedTextId: SelectedTextId;
  onClose: () => void;
}) {
  if (selectedTextId === null) return null;
  if (selectedTextId === "photo") {
    return <PhotoToolbar nc={nc} onClose={onClose} />;
  }
  if (selectedTextId === "map") {
    return <MapToolbar nc={nc} onClose={onClose} />;
  }
  return (
    <TextToolbar nc={nc} onClose={onClose} selectedTextId={selectedTextId} />
  );
}

function PhotoToolbar({ nc, onClose }: { nc: NcReturn; onClose: () => void }) {
  const [qualityOpen, setQualityOpen] = useState(false);
  const scalePercent = Math.round(nc.scale * 100);
  const qualityLabel = nc.removeBgQuality === "hq" ? "HD Quality" : "Standard";

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card px-2 py-1.5 shadow-md">
      <div className="flex items-center">
        <Button
          className="h-7 gap-1.5 rounded-r-none border-r-0 pl-2.5 text-xs"
          disabled={!nc.hasPhoto || nc.removeBgBusy}
          onClick={() => nc.removeBackground(nc.removeBgQuality)}
          size="sm"
          variant="ghost"
        >
          <Sparkles className="size-3.5" />
          {nc.removeBgBusy ? "Removing..." : "Remove BG"}
        </Button>
        <Popover onOpenChange={setQualityOpen} open={qualityOpen}>
          <PopoverTrigger asChild>
            <Button
              className="h-7 rounded-l-none"
              disabled={nc.removeBgBusy}
              size="sm"
              variant="ghost"
            >
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" side="bottom">
            <button
              className={cn(
                "flex w-full items-center rounded-sm px-3 py-2 text-left text-xs hover:bg-accent",
                nc.removeBgQuality === "standard" && "bg-accent",
              )}
              onClick={() => {
                nc.setRemoveBgQuality("standard");
                setQualityOpen(false);
              }}
              type="button"
            >
              Standard
            </button>
            <button
              className={cn(
                "flex w-full items-center rounded-sm px-3 py-2 text-left text-xs hover:bg-accent",
                nc.removeBgQuality === "hq" && "bg-accent",
              )}
              onClick={() => {
                nc.setRemoveBgQuality("hq");
                setQualityOpen(false);
              }}
              type="button"
            >
              HD Quality
            </button>
          </PopoverContent>
        </Popover>
        <span className="ml-1 hidden text-muted-foreground text-xs sm:inline">
          {qualityLabel}
        </span>
      </div>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        aria-label="Decrease photo scale"
        className="size-7"
        onClick={() => nc.setScaleValue("photo", nc.scale - 0.05)}
        size="icon"
        variant="ghost"
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="min-w-8 text-center font-medium text-xs tabular-nums">
        {scalePercent}%
      </span>
      <Button
        aria-label="Increase photo scale"
        className="size-7"
        onClick={() => nc.setScaleValue("photo", nc.scale + 0.05)}
        size="icon"
        variant="ghost"
      >
        <Plus className="size-3.5" />
      </Button>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        aria-label="Close photo toolbar"
        className="size-7"
        onClick={onClose}
        size="icon"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>

      {nc.removeBgMessage && (
        <span className="ml-1 basis-full text-muted-foreground text-xs sm:basis-auto">
          {nc.removeBgMessage}
        </span>
      )}
    </div>
  );
}

function MapToolbar({ nc, onClose }: { nc: NcReturn; onClose: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card px-2 py-1.5 shadow-md">
      <ColorPicker
        displayColor={nc.mapFill}
        onPick={nc.setMapFill}
        onReset={null}
        title="Map color"
      />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <ScaleControls
        onChange={(dir) => nc.adjustScale("map", dir)}
        value={nc.mapScale}
      />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        aria-label="Close map toolbar"
        className="size-7"
        onClick={onClose}
        size="icon"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function TextToolbar({
  nc,
  selectedTextId,
  onClose,
}: {
  nc: NcReturn;
  selectedTextId: Exclude<SelectedTextId, null | "photo" | "map">;
  onClose: () => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);

  const isName = selectedTextId === "name";
  const isMapLabel = selectedTextId === "mapLabel";
  const desIdx = typeof selectedTextId === "number" ? selectedTextId : -1;

  const currentStyle: TextStyleFlags = isName
    ? nc.nameTextStyle
    : isMapLabel
      ? nc.mapLabelTextStyle
      : (nc.designationTextStyles[desIdx] ?? { bold: false, italic: false });

  const defaultColor = isName
    ? NC_FRAME.nameText.color
    : isMapLabel
      ? NC_FRAME.mapLabel.color
      : NC_FRAME.roleText.color;

  const currentColor = isName
    ? nc.nameColor
    : isMapLabel
      ? nc.mapLabelColor
      : (nc.designationColors[desIdx] ?? null);

  const displayColor = currentColor ?? defaultColor;
  const currentScale = nc.getScaleValue(selectedTextId);

  const handleColorChange = (color: string | null) => {
    if (isName) nc.setNameColor(color);
    else if (isMapLabel) nc.setMapLabelColor(color);
    else {
      nc.setDesignationColors((prev) =>
        prev.map((v, i) => (i === desIdx ? color : v)),
      );
    }
  };

  const handleStyleToggle = (key: keyof TextStyleFlags) => {
    if (isName) nc.setNameTextStyle((prev) => ({ ...prev, [key]: !prev[key] }));
    else if (isMapLabel) {
      nc.setMapLabelTextStyle((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      nc.setDesignationTextStyles((prev) =>
        prev.map((s, i) =>
          i === desIdx ? { ...s, [key]: !s[key] } : s,
        ),
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card px-2 py-1.5 shadow-md">
      <ColorPicker
        displayColor={displayColor}
        onPick={handleColorChange}
        onReset={currentColor ? () => handleColorChange(null) : null}
        open={colorOpen}
        setOpen={setColorOpen}
        title="Text color"
      />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <ScaleControls
        onChange={(dir) => nc.adjustScale(selectedTextId, dir)}
        value={currentScale}
      />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        aria-label="Toggle bold"
        className={cn("size-7", currentStyle.bold && "bg-accent")}
        onClick={() => handleStyleToggle("bold")}
        size="icon"
        variant="ghost"
      >
        <Bold className="size-3.5" />
      </Button>
      <Button
        aria-label="Toggle italic"
        className={cn("size-7", currentStyle.italic && "bg-accent")}
        onClick={() => handleStyleToggle("italic")}
        size="icon"
        variant="ghost"
      >
        <Italic className="size-3.5" />
      </Button>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        aria-label="Close text toolbar"
        className="size-7"
        onClick={onClose}
        size="icon"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function ScaleControls({
  value,
  onChange,
}: {
  value: number;
  onChange: (direction: number) => void;
}) {
  return (
    <>
      <Button
        aria-label="Decrease scale"
        className="size-7"
        onClick={() => onChange(-1)}
        size="icon"
        variant="ghost"
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="min-w-8 text-center font-medium text-xs tabular-nums">
        {Math.round(value * 100)}%
      </span>
      <Button
        aria-label="Increase scale"
        className="size-7"
        onClick={() => onChange(1)}
        size="icon"
        variant="ghost"
      >
        <Plus className="size-3.5" />
      </Button>
    </>
  );
}

function ColorPicker({
  displayColor,
  onPick,
  onReset,
  open,
  setOpen,
  title,
}: {
  displayColor: string;
  onPick: (color: string) => void;
  onReset: (() => void) | null;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  title: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = setOpen ?? setInternalOpen;

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex size-7 items-center justify-center rounded-md hover:bg-accent"
          title={title}
          type="button"
        >
          <span className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-foreground text-xs">A</span>
            <span
              className="h-0.5 w-3.5 rounded-full"
              style={{ backgroundColor: displayColor }}
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="top">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-8 gap-1">
            {COLOR_SWATCHES.map((color) => (
              <button
                aria-label={`Set color ${color}`}
                className={cn(
                  "size-6 rounded-full border transition hover:scale-110",
                  displayColor.toLowerCase() === color.toLowerCase()
                    ? "ring-2 ring-primary ring-offset-1"
                    : "border-border",
                )}
                key={color}
                onClick={() => {
                  onPick(color);
                  setIsOpen(false);
                }}
                style={{ backgroundColor: color }}
                title={color}
                type="button"
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-2 py-1">
              <span
                className="block size-5 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: displayColor }}
              />
              <input
                className="w-0 flex-1 rounded-sm border-none bg-transparent font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onChange={(e) => onPick(e.target.value)}
                type="text"
                value={displayColor}
              />
              <input
                className="sr-only"
                onChange={(e) => onPick(e.target.value)}
                type="color"
                value={displayColor}
              />
            </label>
            {onReset && (
              <Button
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                size="sm"
                variant="ghost"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function cssStringToObject(cssString: string): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const declaration of cssString.split(";")) {
    const trimmed = declaration.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    const camelProp = prop.replace(/-([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
    style[camelProp] = value;
  }
  return style as React.CSSProperties;
}

function Handles({
  value,
  visualScale,
  onChange,
  isActive,
  elementId,
}: {
  value: number;
  visualScale: number;
  onChange: (v: number) => void;
  isActive: boolean;
  elementId: string;
}) {
  if (!isActive) return null;

  const handleDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = document.getElementById(elementId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startDist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const startValue = value;

    const onMove = (event: PointerEvent) => {
      const curDist = Math.hypot(event.clientX - cx, event.clientY - cy);
      if (startDist < 1) return;
      onChange(startValue * (curDist / startDist));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleStyle: React.CSSProperties = {
    transform: `scale(${1 / Math.max(0.1, visualScale)})`,
  };

  return (
    <div className="pointer-events-none absolute inset-0 border-2 border-primary">
      {[
        { pos: "-top-4 -left-4", cursor: "cursor-nwse-resize" },
        { pos: "-top-4 -right-4", cursor: "cursor-nesw-resize" },
        { pos: "-bottom-4 -left-4", cursor: "cursor-nesw-resize" },
        { pos: "-bottom-4 -right-4", cursor: "cursor-nwse-resize" },
      ].map(({ pos, cursor }) => (
        <div
          className={cn(
            "pointer-events-auto absolute flex size-8 touch-none select-none items-center justify-center rounded-full",
            pos,
            cursor,
          )}
          key={pos}
          onPointerDown={handleDrag}
          style={handleStyle}
        >
          <div className="size-3.5 rounded-full border border-primary bg-background shadow-sm" />
        </div>
      ))}
    </div>
  );
}
