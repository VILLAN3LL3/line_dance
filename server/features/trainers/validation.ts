import { z } from 'zod';

const requiredText = z.string().trim().min(1);
export const trainerGenders = ['female', 'male', 'diverse'] as const;
export type TrainerGender = (typeof trainerGenders)[number];
const trainerFieldsSchema = z.object({
  name: requiredText,
  phone: requiredText,
  email: requiredText,
  gender: z
    .enum(trainerGenders)
    .nullish()
    .transform((gender) => gender ?? null),
});
const trainerSchema = trainerFieldsSchema.brand<'TrainerInput'>();

export type TrainerDetails = z.output<typeof trainerFieldsSchema>;
export type TrainerInput = z.output<typeof trainerSchema>;

export type TrainerValidationResult =
  | { error: 'name_required' | 'phone_required' | 'email_required' | 'invalid_gender' }
  | { value: TrainerInput };

export function validateTrainer(input: unknown): TrainerValidationResult {
  if (input === null || input === undefined) throw new TypeError('Trainer input is missing');
  const result = trainerSchema.safeParse(input);
  if (result.success) return { value: result.data };

  const field = result.error.issues[0]?.path[0];
  if (field === undefined || field === 'name') return { error: 'name_required' };
  if (field === 'phone') return { error: 'phone_required' };
  if (field === 'email') return { error: 'email_required' };
  if (field === 'gender') return { error: 'invalid_gender' };
  throw new Error(`Unexpected trainer validation field: ${String(field)}`);
}
