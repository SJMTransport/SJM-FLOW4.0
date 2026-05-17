export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function estimateReadingDuration(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 150)
  if (minutes < 1) return '< 1 min read'
  if (minutes === 1) return '1 min read'
  return `${minutes} min read`
}

const STAGES = [
  'Idea',
  'Script',
  'Production',
  'Editing',
  'Review',
  'Ready',
  'Published',
]

export function getStageIndex(stage: string): number {
  const index = STAGES.indexOf(stage)
  return index === -1 ? 0 : index
}

const PLATFORM_COLORS: Record<string, string> = {
  YouTube: '#FF0000',
  Instagram: '#E1306C',
  TikTok: '#010101',
  Twitter: '#1DA1F2',
  X: '#000000',
  LinkedIn: '#0A66C2',
  Facebook: '#1877F2',
  Pinterest: '#E60023',
  Spotify: '#1DB954',
  Podcast: '#9B59B6',
  Blog: '#D4880A',
  Newsletter: '#7A8C5E',
}

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? '#8A8A8A'
}
