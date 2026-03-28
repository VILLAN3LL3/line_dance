export interface Choreography {
  id: number;
  name: string;
  step_sheet_link?: string;
  demo_video_url?: string;
  tutorial_video_url?: string;
  count?: number;
  wall_count?: number;
  level: string;
  creation_year?: number;
  tag_information?: string;
  restart_information?: string;
  authors: string[];
  tags: string[];
  step_figures: string[];
  created_at: string;
  updated_at: string;
}

export interface ChoreographyFormData {
  name: string;
  step_sheet_link?: string;
  demo_video_url?: string;
  tutorial_video_url?: string;
  count?: number;
  wall_count?: number;
  level: string;
  creation_year?: number;
  tag_information?: string;
  restart_information?: string;

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

export interface SearchFilters {
  search?: string;
  level?: string[];
  max_count?: number;
  step_figures?: string[];
  step_figures_match_mode?: 'all' | 'any' | 'exact';
  without_step_figures?: boolean;
  tags?: string[];
  authors?: string[];
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SavedFilterConfiguration {
  id: number;
  name: string;
  filters: SearchFilters;
  created_at: string;
  updated_at: string;
}

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Experienced';
