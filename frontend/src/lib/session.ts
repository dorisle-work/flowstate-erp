import { withGrants } from '../data/access.ts'
import { USERS } from '../data/catalog.ts'
import type { User } from '../types/index.ts'
import { USE_MOCK } from './runtime.ts'

const TOKEN = 'flowstate.token'
const USER = 'flowstate.user'

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN)
}

export function writeToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN, token)
  else {
    sessionStorage.removeItem(TOKEN)
    sessionStorage.removeItem(USER)
  }
}

export function writeUser(user: User | null): void {
  if (user) sessionStorage.setItem(USER, JSON.stringify(user))
  else sessionStorage.removeItem(USER)
}

export function readStoredUser(): User | null {
  const raw = sessionStorage.getItem(USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function userFromToken(token: string | null): User | null {
  if (!token) return null

  if (USE_MOCK || token.startsWith('demo:')) {
    const id = Number(token.split(':')[1])
    const user = USERS.find((item) => item.id === id)
    if (!user) return null
    const { password: _password, ...safe } = user
    return withGrants(safe)
  }

  return readStoredUser()
}
