import type { Exposant, AuthUser, UserProfile } from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  })

  if (res.status === 401 && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const refresh = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST', credentials: 'include',
    })
    if (!refresh.ok) throw new Error('SESSION_EXPIRED')
    const retry = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    })
    if (!retry.ok) throw new Error(await retry.text())
    if (retry.status === 204) return undefined as T
    return retry.json() as Promise<T>
  }

  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      req<{ role: string; email: string }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    logout: () => req('/api/auth/logout', { method: 'POST' }),
    me: () => req<AuthUser>('/api/auth/me'),
  },
  exposants: {
    list: () => req<Exposant[]>('/api/exposants'),
    getById: (id: number) => req<Exposant>(`/api/exposants/${id}`),
    get: (uuid: string) => req<Exposant>(`/api/exposants/${uuid}`),
    create: (data: Omit<Exposant, 'uuid' | 'id'>) =>
      req<Exposant>('/api/exposants', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Omit<Exposant, 'uuid' | 'id'>) =>
      req<Exposant>(`/api/exposants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      req<void>(`/api/exposants/${id}`, { method: 'DELETE' }),
    uploadLogo: (id: number, file: File) => {
      const form = new FormData()
      form.append('logo', file)
      return req<Exposant>(`/api/exposants/${id}/logo`, { method: 'POST', body: form })
    },
    exportPdf: () => fetch(`${BASE}/api/exposants/export/pdf`, { credentials: 'include' }),
  },
  users: {
    list: () => req<UserProfile[]>('/api/users'),
    create: (data: { email: string; password: string; role: 'admin' | 'staff' }) =>
      req<UserProfile>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { email: string; password?: string; role: 'admin' | 'staff' }) =>
      req<UserProfile>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      req<void>(`/api/users/${id}`, { method: 'DELETE' }),
  },
}
