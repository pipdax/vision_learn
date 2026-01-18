
export interface UserSettings {
  age: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  topics: string[];
  htmlContent: string;
  thumbnail: string;
}

export enum ToolType {
  RECT = 'RECT',
  PEN = 'PEN',
  CROP = 'CROP'
}

export enum LessonType {
  IMAGE = 'IMAGE',
  HTML = 'HTML',
  SVG = 'SVG'
}

export interface Annotation {
  type: ToolType;
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
}
