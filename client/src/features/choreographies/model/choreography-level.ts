import type { Choreography, ChoreographyFormData } from "../../../types";

export const hasPersonalLevel = (choreography: Pick<Choreography, "personal_level">): boolean =>
  choreography.personal_level !== null;

/** `level` of a choreography is the effective level; editing always works on the official one. */
export const choreographyToFormData = (choreography: Choreography): ChoreographyFormData => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- derived, not editable in the form
  const { official_level: officialLevel, personal_level: _personalLevel, ...rest } = choreography;
  return { ...rest, level: officialLevel };
};
