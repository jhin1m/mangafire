export type Genre = {
  image: string
  type: string
  title: string
  slug?: string
  chapters: {
    info: string
    date: string
    lang: null
    link?: string
  }[]
}

export type GenreTrending = {
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: string[]
}

export type Poster = {
  image: string
  title: string
  link?: string
}

export enum ENUM_READ_BY {
  CHAPTER = 'chapter',
  VOLUME = 'volume',
}

// Manga CRUD enums
export enum MangaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  HIATUS = 'hiatus',
  CANCELLED = 'cancelled',
}

export enum MangaType {
  MANGA = 'manga',
  MANHWA = 'manhwa',
  MANHUA = 'manhua',
  ONE_SHOT = 'one_shot',
  DOUJINSHI = 'doujinshi',
}

export enum Language {
  EN = 'en',
  JP = 'jp',
  KO = 'ko',
  ZH = 'zh',
}

// Manga entity type
export interface Manga {
  id: number
  title: string
  slug: string
  alternativeTitles: string[] | null
  description: string | null
  author: string | null
  artist: string | null
  coverImage: string | null
  status: MangaStatus
  type: MangaType
  language: Language
  releaseYear: number | null
  rating: number
  views: number
  createdAt: Date
  updatedAt: Date
}

// Manga DTOs
export interface CreateMangaDto {
  title: string
  slug: string
  alternativeTitles?: string[]
  description?: string
  author?: string
  artist?: string
  coverImage?: string
  status?: MangaStatus
  type?: MangaType
  language?: Language
  releaseYear?: number
  genreIds?: number[]
}

export interface UpdateMangaDto {
  title?: string
  slug?: string
  alternativeTitles?: string[]
  description?: string
  author?: string
  artist?: string
  coverImage?: string
  status?: MangaStatus
  type?: MangaType
  language?: Language
  releaseYear?: number
  genreIds?: number[]
}

// Query parameters for manga filtering
export interface MangaQueryParams {
  page?: number
  limit?: number
  status?: MangaStatus
  type?: MangaType
  genreId?: number
  search?: string
  sortBy?: 'rating' | 'views' | 'createdAt' | 'title'
  sortOrder?: 'asc' | 'desc'
}
