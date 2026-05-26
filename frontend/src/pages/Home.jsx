import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import RateHistoryModal from '../components/RateHistoryModal'

export default function Home() {
    const [currencies, setCurrencies] = useState([])
    const [loading, setLoading] = useState(true)

    const user = useMemo(() => {
        const storedUser = localStorage.getItem('user')
        return storedUser ? JSON.parse(storedUser) : null
    }, [])

    useEffect(() => {
        const fetchCurrencies = async () => {
            try {
                const response = await api.get('/currencies/')
                setCurrencies(response.data)
            } finally {
                setLoading(false)
            }
        }
        fetchCurrencies()
    }, [])

    const dashboardLink = user?.role ? `/${user.role}` : '/login'

    return (
        <div className="space-y-6">
            <section className="card bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
                <h1 className="text-3xl font-bold mb-2">Информационная система "Обменный пункт"</h1>
                <div className="flex gap-3">
                    <Link to={dashboardLink} className="btn-primary bg-white text-blue-700 hover:bg-blue-50">
                        {user ? 'Перейти в кабинет' : 'Войти в систему'}
                    </Link>
                    {!user && (
                        <Link to="/register" className="btn-secondary bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
                            Регистрация клиента
                        </Link>
                    )}
                </div>
            </section>

            <section className="card">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Текущие курсы валют</h2>

                {loading ? (
                    <p className="text-gray-500">Загрузка...</p>
                ) : currencies.length === 0 ? (
                    <p className="text-gray-500">Курсы пока не установлены.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="table-header">
                            <tr>
                                <th className="px-4 py-3 text-left">Код</th>
                                <th className="px-4 py-3 text-left">Название</th>
                                <th className="px-4 py-3 text-right">Покупка</th>
                                <th className="px-4 py-3 text-right">Продажа</th>
                                <th className="px-4 py-3 text-left">История</th>
                            </tr>
                            </thead>
                            <tbody>
                            {currencies.map((currency) => (
                                <tr key={currency.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-semibold">{currency.code}</td>
                                    <td className="px-4 py-3">{currency.name}</td>
                                    <td className="px-4 py-3 text-right text-green-600">
                                        {currency.current_buy_rate ? `${currency.current_buy_rate.toFixed(4)} ₽` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-600">
                                        {currency.current_sell_rate ? `${currency.current_sell_rate.toFixed(4)} ₽` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <RateHistoryModal
                                            history={currency.rates_history}
                                            title={`${currency.code} — история курсов`}
                                        />
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="card">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">О нас</h2>
                <div className="space-y-2 text-gray-700">
                    <p>Адрес: г. Москва, ул. Примерная, д. 1</p>
                    <p>Телефон: +7 (999) 999-99-99</p>
                </div>
            </section>
        </div>
    )
}
