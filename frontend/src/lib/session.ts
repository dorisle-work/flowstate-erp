import { withGrants } from '../data/access.ts'
import { USERS } from '../data/catalog.ts'
import type { User } from '../types/index.ts'

const TOKEN = 'flowstate.token'

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN)
}

export function writeToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN, token)
  else sessionStorage.removeItem(TOKEN)
}

export function userFromToken(token: string | null): User | null {
  const id = Number(token?.split(':')[1])
  const user = USERS.find((item) => item.id === id)
  if (!user) return null
  const { password: _password, ...safe } = user
  return withGrants(safe)
}
