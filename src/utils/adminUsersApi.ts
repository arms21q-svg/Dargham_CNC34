import { apiUrl } from './apiBase'
import { getAuthToken } from './siteDataStorage'

export interface AdminUserRecord {
  id: string
  email: string
  username: string
  role: string
  nameAr: string
  nameEn: string
  status: 'active' | 'disabled' | string
  createdAt: string
}

export interface AdminAuditLogRecord {
  id: string
  action: string
  actorEmail: string
  actorRole: string
  targetUserId: string | null
  targetEmail: string | null
  details: string
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
  auditLogs?: AdminAuditLogRecord[]
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
  username: string
  nameAr: string
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

export async function resetAdminUserPassword(
  id: string,
  password?: string
): Promise<{
  ok: boolean
  password?: string
  user?: AdminUserRecord
  message?: string
  error?: string
}> {
  const res = await fetch(apiUrl('/api/admin-users'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      action: 'reset-password',
      id,
      ...(password ? { password } : {}),
    }),
  })

  return (await res.json()) as {
    ok: boolean
    password?: string
    user?: AdminUserRecord
    message?: string
    error?: string
  }
}

export async function setAdminUserStatus(
  id: string,
  status: 'active' | 'disabled'
): Promise<{ ok: boolean; user?: AdminUserRecord; error?: string; message?: string }> {
  const res = await fetch(apiUrl('/api/admin-users'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'set-status', id, status }),
  })

  return (await res.json()) as {
    ok: boolean
    user?: AdminUserRecord
    error?: string
    message?: string
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
