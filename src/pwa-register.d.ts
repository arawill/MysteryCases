declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean
    onNeedRefresh?: () => void
    onRegisterError?: (error: unknown) => void
  }): (reloadPage?: boolean) => Promise<void>
}
