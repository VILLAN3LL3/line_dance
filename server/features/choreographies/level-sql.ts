/**
 * SQL fragments for the effective level of a choreography: the personal level when set,
 * otherwise the official one. They expect the aliases `c` (choreographies) and `l` (levels)
 * of the official level join.
 */
export const personalLevelJoins = `LEFT JOIN personal_data.choreography_personal_levels pers ON pers.choreography_id = c.id
     LEFT JOIN levels pers_level ON pers_level.id = pers.level_id`;

export const effectiveLevelName = 'COALESCE(pers_level.name, l.name)';
export const effectiveLevelValue = 'COALESCE(pers_level.value, l.value)';

export const levelColumns = `${effectiveLevelName} AS level, l.name AS official_level, pers_level.name AS personal_level`;
