export interface TrainerInput {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
}

export interface TrainerDetails {
  name: string;
  phone: string;
  email: string;
}

export type TrainerValidationResult =
  { error: 'name_required' | 'phone_required' | 'email_required' } | { value: TrainerDetails };

export function validateTrainer(input: TrainerInput): TrainerValidationResult {
  const { name, phone, email } = input;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'name_required' };
  }
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return { error: 'phone_required' };
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { error: 'email_required' };
  }

  return { value: { name: name.trim(), phone: phone.trim(), email: email.trim() } };
}
