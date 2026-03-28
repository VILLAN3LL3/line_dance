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

// Dance Groups Types
export interface DanceGroup {
  id: number;
  name: string;
  created_at: string;
}

export interface Trainer {
  id: number;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface DanceCourse {
  id: number;
  dance_group_id: number;
  dance_group_name: string;
  semester: string;
  start_date?: string;
  youtube_playlist_url?: string;
  copperknob_list_url?: string;
  spotify_playlist_url?: string;
  trainer_id?: number | null;
  trainer_name?: string | null;
  trainer_phone?: string | null;
  trainer_email?: string | null;
  created_at: string;
}

export interface Session {
  id: number;
  dance_course_id: number;
  session_date: string;
  dance_group_name: string;
  semester: string;
  created_at: string;
}

export interface SessionChoreography {
  id: number;
  session_id: number;
  choreography_id: number;
  created_at: string;
}

export interface LearnedChoreography {
  dance_group_id: number;
  dance_group_name: string;
  choreography_id: number;
  times_danced: number;
  first_learned_date: string;
  last_danced_date: string;
}
