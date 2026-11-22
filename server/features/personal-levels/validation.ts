import { z } from 'zod';

const levelSchema = z.object({ level: z.string().trim().min(1) });

export type PersonalLevelValidationResult = { error: 'invalid_level' } | { value: string };

export function validatePersonalLevel(input: unknown): PersonalLevelValidationResult {
  const result = levelSchema.safeParse(input);
  return result.success ? { value: result.data.level } : { error: 'invalid_level' };
}
