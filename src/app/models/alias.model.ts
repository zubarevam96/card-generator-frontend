export interface TextAlias {
  id: number;
  type: 'text';
  name: string;
  content: string; // HTML string
  createdAt: number;
}

export interface ImageAlias {
  id: number;
  type: 'image';
  name: string;
  dataUrl: string; // Base64 encoded image
  defaultSize: number; // Default width/height in pixels
  createdAt: number;
}

export type Alias = TextAlias | ImageAlias;
