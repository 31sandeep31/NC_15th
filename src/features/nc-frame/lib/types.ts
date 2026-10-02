export type SelectedTextId =
  | "greeting"
  | "photo"
  | "name"
  | "map"
  | "mapLabel"
  | number
  | null;

export type TextStyleFlags = {
  bold: boolean;
  italic: boolean;
};

export const DEFAULT_TEXT_STYLE: TextStyleFlags = {
  bold: false,
  italic: false,
};
