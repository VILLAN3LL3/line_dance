export type LearningStatus = 'wishlist' | 'learned';

export interface Choreography {
  id: number;
  name: string;
  step_sheet_link?: string;
  demo_video_url?: string;
  tutorial_video_url?: string;
  count?: number;
  wall_count?: number;
  /** Effective level: the personal level when set, otherwise the official one. */
  level: string;
  official_level: string;
  personal_level: string | null;
  creation_year?: number;
  choreography_information?: ChoreographyInformation[];
  choreography_songs: ChoreographySong[];
  authors: string[];
  tags: string[];
  step_figures: string[];
  rating: number | null;
  /** Personal learning status; `null` when the dance is on neither list. */
  learning_status: LearningStatus | null;
  /** Day (YYYY-MM-DD) the current status was set; `null` for entries migrated from hashtags. */
  learning_status_date: string | null;
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
  /** Personal level assessment; empty or null means "same as official". */
  personal_level?: string | null;
  /** Omitted keeps the status; an empty value or null removes it. */
  learning_status?: LearningStatus | '' | null;
  creation_year?: number;
  choreography_information?: ChoreographyInformation[];
  /** Rows without an `id` are new; at most one row is the favorite. */
  choreography_songs?: ChoreographySongInput[];
  authors: string[];
  tags: string[];
  step_figures: string[];
}

export interface ChoreographyInformation {
  id?: number | string;
  category: string;
  description: string;
}

export interface ChoreographySong {
  id: number;
  title: string;
  artist?: string;
  /** Without a stored link the client builds a search link from title and artist. */
  youtube_url?: string;
  spotify_url?: string;
  note?: string;
  bpm?: number;
  length_seconds?: number;
  genre?: string;
  /** Without a favorite the first song is the default. */
  is_favorite: boolean;
}

export interface ChoreographySongInput {
  /** Existing song id, or a client-side placeholder for rows that are not saved yet. */
  id?: number | string;
  title: string;
  artist?: string;
  youtube_url?: string;
  spotify_url?: string;
  note?: string;
  /** Whole numbers only; any other value, including text, is reported as an `invalid_integer` issue. */
  bpm?: number | string;
  length_seconds?: number | string;
  genre?: string;
  is_favorite?: boolean;
}

export interface ChoreographyWriteResponse {
  id: number;
  message: string;
}

export interface ChoreographyIssue {
  field: string;
  key:
    | 'invalid_url'
    | 'invalid_information'
    | 'invalid_songs'
    | 'required'
    | 'invalid_level'
    | 'invalid_integer'
    | 'invalid_learning_status';
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
  song_artist?: string;
  /** The music filters below must all match the same song of a choreography. */
  min_bpm?: number;
  max_bpm?: number;
  max_length_seconds?: number;
  genres?: string[];
  level?: string[];
  max_level_value?: number;
  max_count?: number;
  step_figures?: string[];
  step_figures_match_mode?: 'all' | 'any' | 'exact';
  required_step_figures?: string[];
  without_step_figures?: boolean;
  tags?: string[];
  excluded_tags?: string[];
  authors?: string[];
  min_rating?: number;
  /** Only dances with this learning status. */
  learning_status?: LearningStatus;
  use_official_level?: boolean;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LevelOption {
  id: number;
  name: string;
  value: number;
}

export interface SavedFilterConfiguration {
  id: number;
  name: string;
  filters: SearchFilters;
  created_at: string;
  updated_at: string;
}

export interface StepFigureReference {
  id: number;
  name: string;
}

export interface StepFigureDefinition {
  id: number;
  name: string;
  components: StepFigureReference[];
  parents: StepFigureReference[];
  used_by_choreography_count: number;
}

export interface StepFigureOption {
  id: number;
  name: string;
}

// Dance Groups Types
export interface DanceGroup {
  id: number;
  name: string;
  max_group_level_value?: number | null;
  created_at: string;
}

export interface Trainer {
  id: number;
  name: string;
  phone: string;
  email: string;
  gender?: 'female' | 'male' | 'diverse' | null;
  created_at: string;
}

export interface DanceCourse {
  id: number;
  course_id?: number | null;
  name?: string | null;
  dance_group_id: number;
  dance_group_name: string;
  semester?: string | null;
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
  semester: string | null;
  comment: string | null;
  created_at: string;
}

export interface SessionChoreography {
  id: number;
  session_id: number;
  choreography_id: number;
  created_at: string;
  is_new: boolean;
  repetition_number: number;
  repeat_source_id: number | null;
  auto_repeat: boolean;
  /** Chosen song; null means the default song of the choreography. */
  song_id: number | null;
}

export interface LearnedChoreography {
  dance_group_id: number;
  dance_group_name: string;
  choreography_id: number;
  times_danced: number;
  first_learned_date: string;
  last_danced_date: string;
}

export interface DuplicateChoreography {
  id: number;
  name: string;
  level: string;
  authors: string[];
}

export interface StepFigureSuggestion {
  step_figure: string;
  additional_choreographies: number;
}

export interface SessionStepFigureSuggestionsResult {
  suggestions: StepFigureSuggestion[];
  known_step_figures: string[];
  max_level_value: number | null;
}

export interface AuthorStats {
  name: string;
  total: number;
  by_level: Record<string, number>;
}

export type PracticeConfidence = 'sure' | 'unsure';

/** Practice state of a learned dance (`GET /api/practice/suggestions`). */
export interface PracticeSummary {
  choreography_id: number;
  last_practiced_on: string | null;
  last_note: string | null;
  practice_count: number;
  next_due_on: string | null;
  is_due: boolean;
  /** Days past the due date (negative while not due yet); `null` if never practiced. */
  days_overdue: number | null;
}

export interface PracticeLogEntry {
  id: number;
  choreography_id: number;
  choreography_name: string;
  practiced_on: string;
  confidence: PracticeConfidence;
  note: string | null;
  song_id: number | null;
  song_title: string | null;
  /** Set when the entry put the dance on an interval step instead of recording a practice. */
  step: number | null;
}

export interface PracticeLogRequest {
  choreography_ids: number[];
  /** Defaults to today on the server; past dates are allowed. */
  practiced_on?: string;
  confidence?: PracticeConfidence;
  /** Only valid with exactly one dance. */
  song_id?: number | null;
  note?: string | null;
}

export interface PracticeBaselineRequest {
  choreography_ids: number[];
  /** 1-based step of the interval ladder, see `PracticeIntervalTier`. */
  step: number;
}

export interface PracticeIntervalTier {
  name: string;
  /** Highest level value of the tier; `null` for the last tier. */
  max_level_value: number | null;
  interval_days: number[];
}

export interface PracticeLogPage {
  data: PracticeLogEntry[];
  /** Number of entries matching the filter, over all pages. */
  total: number;
}

/** One bar of the repertoire dashboard. */
export interface StatisticsItem {
  key: string;
  label: string;
  count: number;
}

export interface StatisticsMonth {
  /** YYYY-MM */
  month: string;
  /** Dances learned in the month (by the date of their learning status). */
  learned: number;
  /** Learned dances up to and including the month, with the dances without date. */
  total_learned: number;
  /** Practices logged in the month; interval steps are no practice. */
  practices: number;
}

/** Statistics over the learned dances (`GET /api/statistics/repertoire`). */
export interface RepertoireStatistics {
  total: number;
  levels: StatisticsItem[];
  tempo: StatisticsItem[];
  genres: StatisticsItem[];
  /** The most frequent choreographers; a dance counts for each of its choreographers. */
  choreographers: StatisticsItem[];
  other_choreographers: number;
  years: StatisticsItem[];
  timeline: {
    months: StatisticsMonth[];
    /** Learned dances whose status has no date (migrated from the former hashtags). */
    undated: number;
  };
}
