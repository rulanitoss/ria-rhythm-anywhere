import { it, expect } from 'vitest';
import { accountEmail } from '@/lib/account';
it('uses the same normalized username for signup and login without Gmail', () => {
  expect(accountEmail(' Ruan_123 ')).toBe('ruan_123@riamp.local');
});
it('rejects usernames that cannot identify a unique account safely', () => {
  expect(() => accountEmail('ruan@gmail.com')).toThrow();
});