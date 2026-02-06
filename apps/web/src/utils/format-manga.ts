/**
 * Shared utilities for mapping backend manga data to frontend display shapes.
 */

/**
 * Formats a date into a relative time string ("2 hours ago") or
 * absolute date ("Nov 03, 2023") if older than 7 days.
 */
export function formatChapterDate(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

type ChapterInput = {
  number: string
  title: string | null
  language: string
  createdAt: string | Date
}

type ChapterDisplay = {
  info: string
  date: string
  lang: null
  link: string
}

/**
 * Maps backend latestChapters to the Genre.chapters display shape
 * used by Card component.
 */
export function mapChaptersForCard(
  mangaSlug: string,
  chapters: ChapterInput[]
): ChapterDisplay[] {
  return chapters.map((ch) => ({
    info: `Chap ${ch.number} ${ch.language.toUpperCase()}`,
    date: formatChapterDate(ch.createdAt),
    lang: null,
    link: `/read/${mangaSlug}/${ch.language}/chapter-${ch.number}`,
  }))
}
