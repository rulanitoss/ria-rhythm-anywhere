export const musicPresets = [
  { name: 'Bryan Adams', query: 'Bryan Adams' },
  { name: 'Céline Dion', query: 'Celine Dion' },
  { name: 'Michael Jackson', query: 'Michael Jackson' },
  { name: 'Mariah Carey', query: 'Mariah Carey' },
  { name: 'Internacionais · anos 80', query: '80s international pop hits' },
  { name: 'Internacionais · anos 90', query: '90s international pop hits' },
  { name: 'Trilhas sonoras', query: 'movie soundtrack' },
  { name: 'Love songs', query: 'love songs' },
];

export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] ?? null : null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}