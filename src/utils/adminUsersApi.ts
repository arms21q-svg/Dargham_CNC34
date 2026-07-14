import { apiUrl } from './apiBase'
import { getAuthToken } from './siteDataStorage'

export interface AdminUserRecord {
  id: string
  email: string
  role: string
  nameAr: string
  nameEn: string
  createdAt: string
}

export interface AdminUsersResponse {
  ok: boolean
  superAdmin?: {
    email: string
    role: string
    nameAr: string
    nameEn: string
  } | null
  users?: AdminUserRecord[]
  error?: string
}

function authHeaders() {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function fetchAdminUsers(): Promise<AdminUsersResponse> {
  const res = await fetch(apiUrl('/api/admin-users'), {
    headers: authHeaders(),
  })

  return (await res.json()) as AdminUsersResponse
}

export async function createAdminUser(payload: {
  email: string
  nameAr?: string
  nameEn?: string
}): Promise<{
  ok: boolean
  user?: AdminUserRecord
  password?: string
  message?: string
  error?: string
}> {
  const res = await fetch(apiUrl('/api/admin-users'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })

  return (await res.json()) as {
    ok: boolean
    user?: AdminUserRecord
    password?: string
    message?: string
    error?: string
  }
}

export async function resetAdminUserPassword(id: string): Promise<{
  ok: boolean
  password?: string
  message?: string
  error?: string
}> {
  const res = await fetch(apiUrl('/api/admin-users'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'reset-password', id }),
  })

  return (await res.json()) as {
    ok: boolean
    password?: string
    message?: string
    error?: string
  }
}

export async function deleteAdminUser(id: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await fetch(apiUrl('/api/admin-users'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'delete', id }),
  })

  return (await res.json()) as { ok: boolean; error?: string; message?: string }
}
