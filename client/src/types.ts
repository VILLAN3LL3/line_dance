export interface Choreography {
  id: number;
  name: string;
  step_sheet_link?: string;
  count?: number;
  wall_count?: number;
  level: string;
  creation_year?: number;
  authors: string[];
  tags: string[];
  step_figures: string[];
  created_at: string;
  updated_at: string;
}

export interface ChoreographyFormData {
  name: string;
  step_sheet_link?: string;
  count?: number;
  wall_count?: number;
  level: string;
  creation_year?: number;
  authors: string[];
  tags: string[];
  step_figures: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Experienced';
