import api from '../src/api/axios'

describe('api axios instance', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    test('uses /api baseURL', () => {
        expect(api.defaults.baseURL).toBe('/api')
    })

    test('adds Authorization header when token exists', () => {
        localStorage.setItem('token', 'test-token')

        const handler = api.interceptors.request.handlers[0].fulfilled
        const config = { headers: {} }
        const updated = handler(config)

        expect(updated.headers.Authorization).toBe('Bearer test-token')
    })
})

