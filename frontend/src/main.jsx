import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ClientDashboard from './pages/ClientDashboard'
import CashierDashboard from './pages/CashierDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'
import './index.css'

function App() {
    const [user, setUser] = React.useState(() => {
        const storedUser = localStorage.getItem('user')
        return storedUser ? JSON.parse(storedUser) : null
    })

    React.useEffect(() => {
        const syncUser = () => {
            const storedUser = localStorage.getItem('user')
            setUser(storedUser ? JSON.parse(storedUser) : null)
        }

        window.addEventListener('storage', syncUser)
        window.addEventListener('user-updated', syncUser)
        return () => {
            window.removeEventListener('storage', syncUser)
            window.removeEventListener('user-updated', syncUser)
        }
    }, [])

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-100">
                <Navbar user={user} setUser={setUser} />
                <main className="container mx-auto px-4 py-6">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/profile"
                            element={
                                <PrivateRoute>
                                    <Profile />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/client"
                            element={
                                <PrivateRoute role="client">
                                    <ClientDashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/cashier"
                            element={
                                <PrivateRoute role="cashier">
                                    <CashierDashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <PrivateRoute role="admin">
                                    <AdminDashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                <Toaster position="top-right" />
            </div>
        </BrowserRouter>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
