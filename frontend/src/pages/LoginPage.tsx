import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useErp } from '../context/ErpContext.tsx'
import { USERS } from '../data/catalog.ts'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'

export function LoginPage() {
  const { user, login } = useErp()
  const [email, setEmail] = useState('sales.hn@flowstate.test')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      await login(email, password)
    } catch (caught) {
      if (axios.isAxiosError(caught)) {
        const data = caught.response?.data as { message?: string } | undefined
        setError(data?.message ?? 'Không đăng nhập được.')
      } else {
        setError('Không đăng nhập được.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between bg-white px-7 py-7 text-ink lg:flex">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-[12px] font-bold text-white">FS</span>
            <span className="text-[16px] font-semibold tracking-tight">FlowState</span>
          </div>
          <p className="mt-8 text-[26px] font-semibold leading-snug">Duyệt đơn, giữ tồn, không gửi trùng.</p>
        </div>
        <p className="text-[19px] font-bold">Hà Nội · TP.HCM</p>
      </aside>
      <main className="flex items-center justify-center bg-[#f5f6f8] px-4 py-10">
        <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-sm">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Đăng nhập</h1>
          <p className="mt-1 text-[13px] text-slate-500">Mật khẩu demo của mọi tài khoản là password.</p>
          <label className="mt-5 block text-[12px] font-medium text-slate-600" htmlFor="email">Email</label>
          <Input id="email" className="mt-1" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label className="mt-3 block text-[12px] font-medium text-slate-600" htmlFor="password">Mật khẩu</label>
          <Input id="password" className="mt-1" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <p className="mt-2 text-[12px] text-rose-700">{error}</p> : null}
          <Button type="submit" className="mt-4 w-full" disabled={pending} aria-busy={pending}>
            {pending ? 'Đang đăng nhập...' : 'Vào sổ đơn'}
          </Button>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {USERS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                onClick={() => { setEmail(account.email); setPassword('password') }}
              >
                <span>
                  <span className="block text-[13px] text-slate-800">{account.name}</span>
                  <span className="font-mono text-[11px] tracking-tight text-slate-500">{account.email}</span>
                </span>
                <span className="text-[11px] text-slate-400">{account.roleLabel}</span>
              </button>
            ))}
          </div>
        </form>
      </main>
    </div>
  )
}
