import { z } from 'zod'

export const chapterInfoSchema = z.object({
  info: z.string(),
  date: z.string(),
  lang: z.null(),
})

export const genreSchema = z.object({
  image: z.string(),
  type: z.string(),
  title: z.string(),
  chapters: z.array(chapterInfoSchema),
})

export const genreTrendingSchema = z.object({
  image: z.string(),
  title: z.string(),
  desc: z.string(),
  releasing: z.string(),
  chapterAndVolume: z.string(),
  genres: z.array(z.string()),
})

export const posterSchema = z.object({
  image: z.string(),
  title: z.string(),
  link: z.string().optional(),
})
