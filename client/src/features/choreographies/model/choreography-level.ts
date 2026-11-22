import type { Choreography, ChoreographyFormData } from "../../../types";

export const hasPersonalLevel = (choreography: Pick<Choreography, "personal_level">): boolean =>
  choreography.personal_level !== null;

/** `level` of a choreography is the effective level; editing always works on the official one. */
export const choreographyToFormData = (choreography: Choreography): ChoreographyFormData => {
  const { official_level: officialLevel, ...rest } = choreography;
  return { ...rest, level: officialLevel };
};
