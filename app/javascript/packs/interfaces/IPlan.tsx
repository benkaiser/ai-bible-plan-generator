export interface IPlan {
  title: string;
  description: string;
  days: Array<IPlanDay>;
}

export interface IPlanDay {
  day_number: number;
  outline: string;
  readings: Array<IReading>;
}

export interface IReading {
  book: string;
  chapter: number;
  verse_range?: string;
  why_selected: string;
}

export interface IPlanRequest {
  topic: string;
  length: number;
}