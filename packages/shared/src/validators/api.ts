import { z } from 'zod'

// Common pagination validators
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')
