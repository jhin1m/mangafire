import { z } from 'zod'

export const tableQueriesSchema = z.object({
  total: z.number().optional(),
  pageIndex: z.number().optional(),
  pageSize: z.number().optional(),
  query: z.string().optional(),
  sort: z
    .object({
      order: z.enum(['asc', 'desc', '']),
      key: z.union([z.string(), z.number()]),
    })
    .optional(),
})

export const filterDropdownSchema = z.object({
  id: z.string().optional(),
  value: z.string(),
  label: z.string(),
  checked: z.boolean().optional(),
})
