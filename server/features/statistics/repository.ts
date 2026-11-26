import { allQuery } from '../../scripts/db.ts';
import {
  effectiveLevelName,
  effectiveLevelValue,
  personalLevelJoins,
} from '../choreographies/level-sql.ts';
import type { AuthorRow, PracticeMonthRow, RepertoireRow } from './operations.ts';

/** The learned dances with the data of their default song: the favorite, else the first song. */
export async function listLearnedRows(): Promise<RepertoireRow[]> {
  return allQuery<RepertoireRow>(
    `SELECT c.id AS choreography_id, c.creation_year,
            ${effectiveLevelName} AS level_name, ${effectiveLevelValue} AS level_value,
            ls.status_date AS learned_on, song.bpm AS bpm, genre.name AS genre
     FROM personal_data.choreography_learning_status ls
     JOIN choreographies c ON c.id = ls.choreography_id
     LEFT JOIN levels l ON l.id = c.level_id
     ${personalLevelJoins}
     LEFT JOIN personal_data.choreography_favorite_songs fav ON fav.choreography_id = c.id
     LEFT JOIN choreography_songs song ON song.id = COALESCE(
       (SELECT fs.id FROM choreography_songs fs
        WHERE fs.id = fav.song_id AND fs.choreography_id = c.id),
       (SELECT first.id FROM choreography_songs first
        WHERE first.choreography_id = c.id ORDER BY first.position ASC, first.id ASC LIMIT 1))
     LEFT JOIN genres genre ON genre.id = song.genre_id
     WHERE ls.status = 'learned'`,
  );
}

export async function listLearnedAuthors(): Promise<AuthorRow[]> {
  return allQuery<AuthorRow>(
    `SELECT ca.choreography_id, a.name AS author_name
     FROM personal_data.choreography_learning_status ls
     JOIN choreography_authors ca ON ca.choreography_id = ls.choreography_id
     JOIN authors a ON a.id = ca.author_id
     WHERE ls.status = 'learned'`,
  );
}

/** Practices per month; an entry that only sets an interval step is no practice. */
export async function listPracticeMonths(): Promise<PracticeMonthRow[]> {
  return allQuery<PracticeMonthRow>(
    `SELECT substr(l.practiced_on, 1, 7) AS month, COUNT(*) AS practices
     FROM personal_data.choreography_practice_log l
     JOIN choreographies c ON c.id = l.choreography_id
     WHERE l.step IS NULL
     GROUP BY month
     ORDER BY month`,
  );
}
