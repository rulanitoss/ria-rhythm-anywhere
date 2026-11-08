import { describe, it, expect } from 'vitest';
import { musicPresets, youtubeVideoId } from '@/lib/music-presets';

describe('Predefined music selections', () => {
  for (const artist of ['Bryan Adams', 'Céline Dion', 'Michael Jackson', 'Mariah Carey']) {
    it(`includes ${artist}`, () => expect(musicPresets.some(p => p.name === artist)).toBe(true));
  }
  it('includes international music from the 80s', () => expect(musicPresets.some(p => p.query === '80s international pop hits')).toBe(true));
  it('includes international music from the 90s', () => expect(musicPresets.some(p => p.query === '90s international pop hits')).toBe(true));
  it('includes soundtracks', () => expect(musicPresets.some(p => p.query === 'movie soundtrack')).toBe(true));
  it('includes love songs', () => expect(musicPresets.some(p => p.query === 'love songs')).toBe(true));
});
describe('YouTube links', () => {
  it('accepts official watch and short links', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects unrelated hosts and invalid ids', () => {
    expect(youtubeVideoId('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeVideoId('https://youtu.be/invalid')).toBeNull();
  });
});