/** Mock stays on unless explicitly disabled. Vercel demo keeps mock; live API needs VITE_USE_MOCK=false. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
