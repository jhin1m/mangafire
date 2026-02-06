import { Context } from 'hono'
import type { ApiResponse, PaginationMeta } from '@mangafire/shared/types'

/**
 * Creates a successful API response with optional pagination metadata.
 */
export function successResponse<T>(
  c: Context,
  data: T,
  meta?: PaginationMeta,
  status = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json(response, status as any)
}

/**
 * Creates an error API response.
 */
export function errorResponse(
  c: Context,
  message: string,
  code?: string,
  status = 400
) {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      message,
      ...(code && { code }),
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json(response, status as any)
}

/**
 * Creates a successful response with 201 Created status.
 */
export function createdResponse<T>(c: Context, data: T) {
  return successResponse(c, data, undefined, 201)
}

/**
 * Returns a 204 No Content response.
 */
export function noContentResponse(c: Context) {
  return c.body(null, 204)
}
