export type AppConfig = {
  apiPrefix: string
  authenticatedEntryPath: string
  unAuthenticatedEntryPath: string
  locale: string
  enableMock: boolean
}

const appConfig: AppConfig = {
  apiPrefix: '/api',
  authenticatedEntryPath: '/',
  unAuthenticatedEntryPath: '/',
  locale: 'en',
  enableMock: false,
}

export default appConfig
