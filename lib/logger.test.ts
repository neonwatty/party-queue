import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original NODE_ENV
const originalEnv = process.env.NODE_ENV

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NODE_ENV = originalEnv
    vi.resetModules()
  })

  async function loadLogger() {
    const mod = await import('./logger')
    return mod.logger
  }

  describe('in development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('debug logs in dev', async () => {
      const logger = await loadLogger()
      logger.debug('test debug')
      expect(console.log).toHaveBeenCalledWith('test debug')
    })

    it('info logs in dev', async () => {
      const logger = await loadLogger()
      logger.info('test info')
      expect(console.log).toHaveBeenCalledWith('test info')
    })
  })

  describe('warn and error (always shown)', () => {
    it('warn logs with formatted message', async () => {
      const logger = await loadLogger()
      logger.warn('test warning')
      expect(console.warn).toHaveBeenCalledWith('test warning')
    })

    it('error logs plain message', async () => {
      const logger = await loadLogger()
      logger.error('test error')
      expect(console.error).toHaveBeenCalledWith('test error')
    })

    it('error logs with Error object', async () => {
      const logger = await loadLogger()
      const err = new Error('boom')
      logger.error('something failed', err)
      expect(console.error).toHaveBeenCalledWith('something failed', err)
    })

    it('error logs with non-Error value', async () => {
      const logger = await loadLogger()
      logger.error('something failed', 'string-error')
      expect(console.error).toHaveBeenCalledWith('something failed', 'string-error')
    })
  })

  describe('formatMessage with context', () => {
    it('formats with component context', async () => {
      const logger = await loadLogger()
      logger.warn('msg', { component: 'TestComp' })
      expect(console.warn).toHaveBeenCalledWith('[TestComp] msg')
    })

    it('formats with component and action', async () => {
      const logger = await loadLogger()
      logger.warn('msg', { component: 'Comp', action: 'init' })
      expect(console.warn).toHaveBeenCalledWith('[Comp] (init) msg')
    })

    it('formats with action only', async () => {
      const logger = await loadLogger()
      logger.warn('msg', { action: 'click' })
      expect(console.warn).toHaveBeenCalledWith('(click) msg')
    })
  })

  describe('createLogger', () => {
    it('creates scoped logger with component prefix', async () => {
      const logger = await loadLogger()
      const scoped = logger.createLogger('MyComponent')
      scoped.warn('scoped warning')
      expect(console.warn).toHaveBeenCalledWith('[MyComponent] scoped warning')
    })

    it('scoped logger passes additional context', async () => {
      const logger = await loadLogger()
      const scoped = logger.createLogger('Auth')
      scoped.warn('login failed', { action: 'login' })
      expect(console.warn).toHaveBeenCalledWith('[Auth] (login) login failed')
    })

    it('scoped logger error with Error object', async () => {
      const logger = await loadLogger()
      const scoped = logger.createLogger('API')
      const err = new Error('timeout')
      scoped.error('request failed', err)
      expect(console.error).toHaveBeenCalledWith('[API] request failed', err)
    })
  })
})
