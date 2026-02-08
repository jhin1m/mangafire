import { z } from 'zod'
import { mangaStatusSchema, mangaTypeSchema } from './manga'

export const searchQueryParamsSchema = z.object({
  q: z.string().max(200).trim().default(''),
  mode: z.enum(['autocomplete', 'full']).default('full'),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  genreId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
