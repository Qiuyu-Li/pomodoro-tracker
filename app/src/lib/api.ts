const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const AUTH_UNAUTHORIZED_EVENT = 'pomodoro:unauthorized'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

interface ApiOptions extends RequestInit {
  accessToken?: string
}

const buildHeaders = (options?: ApiOptions) => {
  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (options?.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`)
  }
  return headers
}

export async function apiFetch<T>(path: string, options?: ApiOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options),
  })

  if (!response.ok) {
    const { payload, message } = await parseErrorPayload(response)
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(AUTH_UNAUTHORIZED_EVENT, {
          detail: { message },
        }),
      )
    }
    throw new ApiError(message, response.status, payload)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

const pickFieldError = (payload: unknown): string | null => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('errors' in payload) ||
    typeof (payload as Record<string, unknown>).errors !== 'object'
  ) {
    return null
  }

  const errors = (payload as { errors: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }).errors
  const fieldErrors = errors.fieldErrors
  if (fieldErrors) {
    for (const key of Object.keys(fieldErrors)) {
      const issues = fieldErrors[key]
      if (issues && issues.length) {
        return issues[0]
      }
    }
  }

  const formErrors = errors.formErrors
  if (formErrors && formErrors.length) {
    return formErrors[0]
  }

  return null
}

const deriveMessage = (payload: unknown, fallback: string) => {
  const detailed = pickFieldError(payload)
  if (detailed) return detailed
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

const parseErrorPayload = async (response: Response) => {
  try {
    const text = await response.text()
    if (!text) {
      return { payload: null, message: response.statusText }
    }
    const payload = JSON.parse(text)
    return { payload, message: deriveMessage(payload, response.statusText) }
  } catch (error) {
    return { payload: null, message: response.statusText }
  }
}

export { API_BASE, AUTH_UNAUTHORIZED_EVENT }
