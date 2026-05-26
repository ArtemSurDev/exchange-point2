import { Link, useNavigate } from 'react-router-dom'
import { CurrencyDollarIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export default function Navbar({ user, setUser }) {
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        navigate('/')
    }

    const getDashboardLink = () => {
        if (!user) return '/'
        switch (user.role) {
            case 'client': return '/client'
            case 'cashier': return '/cashier'
            case 'admin': return '/admin'
            default: return '/'
        }
    }

    return (
        <nav className="bg-white shadow-md border-b-4 border-blue-600">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-2">
                        <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                        <span className="text-xl font-bold text-blue-600">Обменник</span>
                    </Link>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                 <Link
                                     to={getDashboardLink()}
                                     className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition"
                                 >
                                     <UserIcon className="h-5 w-5" />
                                     <span>{user.full_name || user.email}</span>
                                 </Link>
                                <Link to="/profile" className="text-gray-700 hover:text-blue-600 transition">
                                    Профиль
                                </Link>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {user.role === 'client' && 'Клиент'}
                                    {user.role === 'cashier' && 'Кассир'}
                                    {user.role === 'admin' && 'Администратор'}
                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 transition"
                                >
                                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                    <span>Выйти</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn-secondary">
                                    Войти
                                </Link>
                                <Link to="/register" className="btn-primary">
                                    Регистрация
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
