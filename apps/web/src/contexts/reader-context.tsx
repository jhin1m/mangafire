import { createContext, useContext, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useChapterDetail, useChapterList } from '@/hooks/use-chapters'
import type {
  ChapterWithPages,
  ChapterPage,
  ChapterNavigation,
  Chapter,
  PaginationMeta,
} from '@mangafire/shared/types'

// Shared state for all reader components (Header, ProgressBar, SubPanels, Read.tsx)
interface ReaderContextValue {
  // Current chapter data
  chapter: ChapterWithPages | undefined
  pages: ChapterPage[]
  navigation: ChapterNavigation | undefined
  totalPages: number

  // Chapter list for SubPanelChapter
  chapterList: Chapter[]
  chapterListMeta: PaginationMeta | undefined
  totalChapters: number

  // URL params
  mangaSlug: string
  language: string
  chapterNumber: string

  // Loading states
  isLoading: boolean
  isError: boolean
}

const ReaderContext = createContext<ReaderContextValue | null>(null)

/**
 * Parse reader URL: /read/:slug/:lang?/:chapter?
 * Uses pathname directly because ReaderProvider lives outside <Routes>,
 * so useParams() returns empty object. useLocation() always works.
 */
function parseReaderUrl(pathname: string) {
  // Remove leading slash, split into segments
  // Expected: ["read", slug, lang?, chapter?]
  const segments = pathname.replace(/^\//, '').split('/')

  const slug = segments[1] || ''
  const lang = segments[2] || 'en'

  // Extract chapter number from "chapter-{number}" format
  const chapterParam = segments[3]
  let chapterNumber = '1'
  if (chapterParam) {
    chapterNumber = chapterParam.replace(/^chapter-/, '')
  }

  return { slug, lang, chapterNumber }
}

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { slug: mangaSlug, lang: language, chapterNumber } = parseReaderUrl(pathname)

  // Fetch current chapter with pages and navigation
  const {
    data: chapter,
    isLoading: isChapterLoading,
    isError: isChapterError,
  } = useChapterDetail(mangaSlug, chapterNumber, language as never)

  // Fetch chapter list for sidebar panel (desc order, up to 200)
  const {
    data: chapterListData,
  } = useChapterList(mangaSlug, {
    limit: 200,
    sortOrder: 'desc',
  })

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ReaderContextValue>(() => ({
    chapter,
    pages: chapter?.pages ?? [],
    navigation: chapter?.navigation,
    totalPages: chapter?.pages?.length ?? 0,

    chapterList: chapterListData?.items ?? [],
    chapterListMeta: chapterListData?.meta,
    totalChapters: chapterListData?.meta?.total ?? 0,

    mangaSlug,
    language,
    chapterNumber,

    isLoading: isChapterLoading,
    isError: isChapterError,
  }), [chapter, chapterListData, mangaSlug, language, chapterNumber, isChapterLoading, isChapterError])

  return (
    <ReaderContext.Provider value={value}>
      {children}
    </ReaderContext.Provider>
  )
}

/**
 * Hook to access reader data. Must be used within ReaderProvider.
 * Throws if used outside — this helps catch bugs early during development.
 */
export function useReader(): ReaderContextValue {
  const context = useContext(ReaderContext)
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider')
  }
  return context
}
