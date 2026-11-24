/**
 * SQL fragments for the personal learning status of a choreography. They expect the alias `c`
 * (choreographies) and add the alias `ls` for the status row.
 */
export const learningStatusJoin = `LEFT JOIN personal_data.choreography_learning_status ls ON ls.choreography_id = c.id`;

export const learningStatusColumns =
  'ls.status AS learning_status, ls.status_date AS learning_status_date';
