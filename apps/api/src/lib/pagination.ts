import type { PaginationMeta, PaginationParams } from '@mangafire/shared/types'

/**
 * Calculates pagination metadata based on total items and pagination parameters.
 */
export function calculatePagination(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const page = params.page || 1
  const limit = params.limit || 20

  // Handle edge case where total is 0
  const pages = total === 0 ? 0 : Math.ceil(total / limit)

  return {
    total,
    page,
    limit,
    pages,
  }
}

/**
 * Calculates database offset and limit from pagination parameters.
 * Used for database queries with OFFSET and LIMIT clauses.
 */
export function getOffsetLimit(params: PaginationParams): {
  offset: number
  limit: number
} {
  const page = params.page || 1
  const limit = params.limit || 20
  const offset = (page - 1) * limit

  return { offset, limit }
}
