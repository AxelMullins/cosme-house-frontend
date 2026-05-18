import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

export const TOKEN_STORAGE_KEY = 'cosme_house_token'

const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not defined. Check your .env file.')
}

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type ApiErrorPayload = {
  message: string
  code?: string
  status: number
}

export class ApiRequestError extends Error {
  status: number
  code?: string

  constructor(payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiRequestError'
    this.status = payload.status
    this.code = payload.code
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success: false; error: { message: string; code?: string } }>) => {
    if (error.response) {
      const { status, data } = error.response
      const message = data?.error?.message ?? 'Error en la solicitud'
      const code = data?.error?.code

      if (status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      return Promise.reject(new ApiRequestError({ message, code, status }))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new ApiRequestError({
          message: 'El servidor tardó demasiado en responder. Render free tier puede estar despertando — reintentá en unos segundos.',
          code: 'TIMEOUT',
          status: 0,
        })
      )
    }

    return Promise.reject(
      new ApiRequestError({
        message: error.message || 'Error de red',
        code: 'NETWORK_ERROR',
        status: 0,
      })
    )
  }
)

export async function unwrap<T>(promise: Promise<{ data: { success: boolean; data?: T; error?: { message: string; code?: string } } }>): Promise<T> {
  const response = await promise
  if (!response.data.success) {
    throw new ApiRequestError({
      message: response.data.error?.message ?? 'Unknown error',
      code: response.data.error?.code,
      status: 0,
    })
  }
  return response.data.data as T
}
