import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

/**
 * Global error handler middleware for the Hono application.
 * Handles various error types and returns appropriate HTTP responses.
 */
export async function errorHandler(err: Error, c: Context) {
  console.error('Error occurred:', err)

  // Handle Hono HTTPException
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: 'HTTP_EXCEPTION',
        },
      },
      err.status
    )
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.errors,
        },
      },
      400
    )
  }

  // Handle database unique constraint violations
  if (err.message.toLowerCase().includes('unique constraint')) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Resource already exists',
          code: 'DUPLICATE_ENTRY',
        },
      },
      409
    )
  }

  // Handle database foreign key constraint violations
  if (err.message.toLowerCase().includes('foreign key constraint')) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Referenced resource not found',
          code: 'FOREIGN_KEY_VIOLATION',
        },
      },
      400
    )
  }

  // Generic error handler
  const isDevelopment = process.env.NODE_ENV === 'development'
  return c.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && { details: err.message }),
      },
    },
    500
  )
}
