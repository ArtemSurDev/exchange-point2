import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import PrivateRoute from '../src/components/PrivateRoute.jsx'

describe('PrivateRoute', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    const renderRoute = (ui) =>
        render(
            <MemoryRouter initialEntries={['/private']}>
                <Routes>
                    <Route path="/login" element={<div>Login</div>} />
                    <Route path="/client" element={<div>Client</div>} />
                    <Route path="/private" element={ui} />
                </Routes>
            </MemoryRouter>
        )

    test('redirects to login when not authenticated', () => {
        renderRoute(
            <PrivateRoute>
                <div>Secret</div>
            </PrivateRoute>
        )

        expect(screen.getByText('Login')).toBeInTheDocument()
    })

    test('renders children when authenticated and role allowed', () => {
        localStorage.setItem('token', 'token')
        localStorage.setItem('user', JSON.stringify({ role: 'client' }))

        renderRoute(
            <PrivateRoute role="client">
                <div>Secret</div>
            </PrivateRoute>
        )

        expect(screen.getByText('Secret')).toBeInTheDocument()
    })

    test('redirects to role home when role does not match', () => {
        localStorage.setItem('token', 'token')
        localStorage.setItem('user', JSON.stringify({ role: 'client' }))

        renderRoute(
            <PrivateRoute role="cashier">
                <div>Secret</div>
            </PrivateRoute>
        )

        expect(screen.getByText('Client')).toBeInTheDocument()
    })
})

