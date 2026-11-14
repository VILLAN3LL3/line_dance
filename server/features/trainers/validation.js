export function validateTrainer(input) {
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
