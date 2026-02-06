import { Language } from './manga'

// Volume entity — groups chapters into numbered volumes
export interface Volume {
  id: number
  mangaId: number
  number: number
  title: string | null
  coverImage: string | null
  createdAt: Date
  updatedAt: Date
}

// Chapter entity — string number supports decimals like "10.5"
export interface Chapter {
  id: number
  mangaId: number
  volumeId: number | null
  number: string
  title: string | null
  slug: string
  language: Language
  pageCount: number
  createdAt: Date
  updatedAt: Date
}

// Single page within a chapter
export interface ChapterPage {
  id: number
  chapterId: number
  pageNumber: number
  imageUrl: string
  width: number | null
  height: number | null
}

// Prev/next links for reader navigation
export interface ChapterNavigation {
  prev: { number: string; slug: string } | null
  next: { number: string; slug: string } | null
}

// Chapter with pages and navigation — returned by reader endpoint
export interface ChapterWithPages extends Chapter {
  pages: ChapterPage[]
  navigation: ChapterNavigation
}

// DTOs for creating/updating chapters and volumes
export interface CreateChapterDto {
  number: string
  title?: string
  slug: string
  volumeId?: number
  language?: Language
  pages: CreateChapterPageDto[]
}

export interface UpdateChapterDto {
  title?: string
  slug?: string
  volumeId?: number | null
  language?: Language
}

export interface CreateChapterPageDto {
  pageNumber: number
  imageUrl: string
  width?: number
  height?: number
}

export interface CreateVolumeDto {
  number: number
  title?: string
  coverImage?: string
}

export interface UpdateVolumeDto {
  number?: number
  title?: string
  coverImage?: string
}

// Query params for chapter list endpoint
export interface ChapterQueryParams {
  page?: number
  limit?: number
  language?: Language
  sortOrder?: 'asc' | 'desc'
}
