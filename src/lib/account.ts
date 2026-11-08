export function accountEmail(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(normalized)) throw new Error('Use de 3 a 30 letras, números ou sublinhados no utilizador.');
  return `${normalized}@riamp.local`;
}