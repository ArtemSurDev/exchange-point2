import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import {
    UserPlusIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    UsersIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import api from '../api/axios'
import RateHistoryModal from '../components/RateHistoryModal'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('cashiers')
    const [cashiers, setCashiers] = useState([])
    const [admins, setAdmins] = useState([])
    const [currencies, setCurrencies] = useState([])
    const [rates, setRates] = useState([])
    const [operations, setOperations] = useState([])
    const [stats, setStats] = useState([])
    const [reportDates, setReportDates] = useState({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    })

    const [cashierForm, setCashierForm] = useState({
        email: '',
        password: '',
        full_name: ''
    })
    const [adminForm, setAdminForm] = useState({
        email: '',
        password: '',
        full_name: ''
    })
    const [resetPasswords, setResetPasswords] = useState({})

    const [currencyForm, setCurrencyForm] = useState({
        code: '',
        name: '',
        symbol: ''
    })

    const [rateForm, setRateForm] = useState({
        currency_id: '',
        buy_rate: '',
        sell_rate: ''
    })

    const [editingCurrency, setEditingCurrency] = useState(null)
    const [editingCurrencyForm, setEditingCurrencyForm] = useState({
        code: '', name: '', symbol: ''
    })

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        try {
            const [cashiersRes, adminsRes, currenciesRes, ratesRes, opsRes] = await Promise.all([
                api.get('/admin/cashiers'),
                api.get('/admin/admins'),
                api.get('/currencies/'),
                api.get('/admin/exchange-rates'),
                api.get('/operations/my')
            ])
            setCashiers(cashiersRes.data)
            setAdmins(adminsRes.data)
            setCurrencies(currenciesRes.data)
            setRates(ratesRes.data)
            setOperations(opsRes.data)
        } catch (error) {
            toast.error('Ошибка загрузки данных')
        }
    }

    const createCashier = async (e) => {
        e.preventDefault()
        try {
            const response = await api.post('/admin/cashiers', cashierForm)
            setCashiers([...cashiers, response.data])
            setCashierForm({ email: '', password: '', full_name: '' })
            toast.success('Кассир создан')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка создания')
        }
    }

    const createAdmin = async (e) => {
        e.preventDefault()
        try {
            const response = await api.post('/admin/admins', adminForm)
            setAdmins([...admins, response.data])
            setAdminForm({ email: '', password: '', full_name: '' })
            toast.success('Пароль администратор создан')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка создания админа')
        }
    }

    const deleteAdmin = async (id) => {
        if (!window.confirm('Уверены что хотите удалить администратора?')) return
        try {
            await api.delete(`/admin/admins/${id}`)
            setAdmins(admins.filter(a => a.id !== id))
            toast.success('Администратор удален')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка удаления админа')
        }
    }

    const createCurrency = async (e) => {
        e.preventDefault()
        try {
            const response = await api.post('/admin/currencies', currencyForm)
            setCurrencies([...currencies, response.data])
            setCurrencyForm({ code: '', name: '', symbol: '' })
            toast.success('Валюта добавлена')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка добавления')
        }
    }

    const deleteCurrency = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить (скрыть) эту валюту?')) return
        try {
            await api.delete(`/admin/currencies/${id}`)
            setCurrencies(currencies.filter(c => c.id !== id))
            toast.success('Валюта удалена')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка удаления')
        }
    }

    const editCurrency = async (id, updatedData) => {
        try {
            const response = await api.put(`/admin/currencies/${id}`, updatedData)
            setCurrencies(currencies.map(c => c.id === id ? response.data : c))
            toast.success('Валюта обновлена')
            setEditingCurrency(null)
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка обновления')
        }
    }

    const createRate = async (e) => {
        e.preventDefault()
        try {
            const response = await api.post('/admin/exchange-rates', {
                ...rateForm,
                buy_rate: parseFloat(rateForm.buy_rate),
                sell_rate: parseFloat(rateForm.sell_rate),
                currency_id: parseInt(rateForm.currency_id)
            })
            setRates([response.data, ...rates])
            setRateForm({ currency_id: '', buy_rate: '', sell_rate: '' })
            toast.success('Курс установлен')
            fetchAllData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка установки курса')
        }
    }

    const generateReport = async () => {
        try {
            const response = await api.post('/reports/stats', reportDates)
            setStats(response.data)
            toast.success('Отчет сформирован')
        } catch (error) {
            toast.error('Ошибка формирования отчета')
        }
    }

    const downloadReportPdf = async () => {
        try {
            const response = await api.post('/reports/stats/pdf', reportDates, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'exchange_report.pdf')
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            toast.error('Ошибка выгрузки PDF отчета')
        }
    }

    const toggleCashierStatus = async (cashier) => {
        try {
            const response = await api.patch(`/admin/cashiers/${cashier.id}/status`, {
                is_active: !cashier.is_active
            })
            setCashiers(cashiers.map((item) => item.id === cashier.id ? response.data : item))
            toast.success(response.data.is_active ? 'Кассир разблокирован' : 'Кассир заблокирован')
        } catch {
            toast.error('Ошибка изменения статуса кассира')
        }
    }

    const resetCashierPassword = async (cashierId) => {
        const newPassword = resetPasswords[cashierId]
        if (!newPassword || newPassword.length < 8) {
            toast.error('Новый пароль должен быть не короче 8 символов')
            return
        }

        try {
            await api.patch(`/admin/cashiers/${cashierId}/reset-password`, { new_password: newPassword })
            setResetPasswords((prev) => ({ ...prev, [cashierId]: '' }))
            toast.success('Пароль кассира обновлен')
        } catch {
            toast.error('Ошибка сброса пароля')
        }
    }

    const getChartData = () => {
        return {
            labels: stats.map(s => s.currency_code),
            datasets: [
                {
                    label: 'Покупка (сумма)',
                    data: stats.map(s => s.total_buy_amount),
                    backgroundColor: '#10B981',
                },
                {
                    label: 'Продажа (сумма)',
                    data: stats.map(s => s.total_sell_amount),
                    backgroundColor: '#EF4444',
                }
            ]
        }
    }

    const getPieData = () => {
        return {
            labels: stats.map(s => s.currency_code),
            datasets: [
                {
                    data: stats.map(s => s.operations_count),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                }
            ]
        }
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Панель администратора</h1>

            <div className="flex flex-wrap border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('cashiers')}
                    className={`px-6 py-3 font-medium transition flex items-center ${
                        activeTab === 'cashiers'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <UsersIcon className="h-5 w-5 mr-2" />
                    Сотрудники
                </button>
                <button
                    onClick={() => setActiveTab('currencies')}
                    className={`px-6 py-3 font-medium transition flex items-center ${
                        activeTab === 'currencies'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                    Валюты и курсы
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 font-medium transition flex items-center ${
                        activeTab === 'reports'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Отчеты
                </button>
                <button
                    onClick={() => setActiveTab('operations')}
                    className={`px-6 py-3 font-medium transition flex items-center ${
                        activeTab === 'operations'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Все операции
                </button>
            </div>

            {activeTab === 'cashiers' && (
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                                <UserPlusIcon className="h-6 w-6 text-blue-600 mr-2" />
                                Создать кассира
                            </h2>

                            <form onSubmit={createCashier} className="space-y-4">
                                <input
                                    type="email"
                                    required
                                    className="input-field"
                                    placeholder="Email"
                                    value={cashierForm.email}
                                    onChange={(e) => setCashierForm({...cashierForm, email: e.target.value})}
                                />
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="ФИО"
                                    value={cashierForm.full_name}
                                    onChange={(e) => setCashierForm({...cashierForm, full_name: e.target.value})}
                                />
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    className="input-field"
                                    placeholder="Пароль"
                                    value={cashierForm.password}
                                    onChange={(e) => setCashierForm({...cashierForm, password: e.target.value})}
                                />
                                <button type="submit" className="btn-primary w-full">
                                    Создать кассира
                                </button>
                            </form>
                        </div>
                        {localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).email === 'admin@exchange.ru' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                                <UserPlusIcon className="h-6 w-6 text-red-600 mr-2" />
                                Создать администратора
                            </h2>

                            <form onSubmit={createAdmin} className="space-y-4">
                                <input type="email" required className="input-field" placeholder="Email"
                                    value={adminForm.email} onChange={(e) => setAdminForm({...adminForm, email: e.target.value})} />
                                <input type="text" required className="input-field" placeholder="ФИО"
                                    value={adminForm.full_name} onChange={(e) => setAdminForm({...adminForm, full_name: e.target.value})} />
                                <input type="password" required minLength={8} className="input-field" placeholder="Пароль"
                                    value={adminForm.password} onChange={(e) => setAdminForm({...adminForm, password: e.target.value})} />
                                <button type="submit" className="btn-primary w-full bg-red-600 hover:bg-red-700">
                                    Создать администратора
                                </button>
                            </form>
                        </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Список кассиров</h2>

                            <div className="space-y-2">
                                {cashiers.map((cashier) => (
                                    <div key={cashier.id} className="p-3 bg-gray-50 rounded-lg">
                                        <p className="font-medium">{cashier.full_name}</p>
                                        <p className="text-sm text-gray-600">{cashier.email}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className={`text-xs font-medium ${cashier.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                            {cashier.is_active ? 'Активен' : 'Заблокирован'}
                                            </span>
                                            <button
                                                onClick={() => toggleCashierStatus(cashier)}
                                                className="text-xs btn-secondary"
                                            >
                                                {cashier.is_active ? 'Блокировать' : 'Разблокировать'}
                                            </button>
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <input
                                                type="password"
                                                minLength={8}
                                                className="input-field text-sm"
                                                placeholder="Новый пароль"
                                                value={resetPasswords[cashier.id] || ''}
                                                onChange={(e) => setResetPasswords((prev) => ({ ...prev, [cashier.id]: e.target.value }))}
                                            />
                                            <button
                                                onClick={() => resetCashierPassword(cashier.id)}
                                                className="btn-secondary text-xs whitespace-nowrap"
                                            >
                                                Сбросить
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {cashiers.length === 0 && (
                                    <p className="text-gray-500 text-center py-4">Нет кассиров</p>
                                )}
                            </div>
                        </div>

                        {localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).email === 'admin@exchange.ru' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Список администраторов</h2>
                            <div className="space-y-2">
                                {admins.map((adm) => (
                                    <div key={adm.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{adm.full_name}</p>
                                            <p className="text-sm text-gray-600">{adm.email}</p>
                                        </div>
                                        {adm.email !== 'admin@exchange.ru' && (
                                            <button onClick={() => deleteAdmin(adm.id)} className="text-red-600 text-sm hover:underline">
                                                Удалить
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'currencies' && (
                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Добавить валюту</h2>

                        <form onSubmit={createCurrency} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                required
                                maxLength="3"
                                className="input-field"
                                placeholder="Код (USD, EUR...)"
                                value={currencyForm.code}
                                onChange={(e) => setCurrencyForm({...currencyForm, code: e.target.value.toUpperCase()})}
                            />
                            <input
                                type="text"
                                required
                                className="input-field"
                                placeholder="Название"
                                value={currencyForm.name}
                                onChange={(e) => setCurrencyForm({...currencyForm, name: e.target.value})}
                            />
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Символ ($, €...)"
                                    value={currencyForm.symbol}
                                    onChange={(e) => setCurrencyForm({...currencyForm, symbol: e.target.value})}
                                />
                                <button type="submit" className="btn-primary">Добавить</button>
                            </div>
                        </form>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Список валют</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="table-header">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Код</th>
                                        <th className="px-4 py-3 text-left">Название</th>
                                        <th className="px-4 py-3 text-left">Символ</th>
                                        <th className="px-4 py-3 text-left">История</th>
                                        <th className="px-4 py-3 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currencies.map((curr) => (
                                        <tr key={curr.id} className="border-b hover:bg-gray-50">
                                            {editingCurrency === curr.id ? (
                                                <>
                                                    <td className="px-4 py-2">
                                                        <input className="input-field py-1" value={editingCurrencyForm.code} onChange={e => setEditingCurrencyForm({...editingCurrencyForm, code: e.target.value.toUpperCase()})} />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input className="input-field py-1" value={editingCurrencyForm.name} onChange={e => setEditingCurrencyForm({...editingCurrencyForm, name: e.target.value})} />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input className="input-field py-1" value={editingCurrencyForm.symbol} onChange={e => setEditingCurrencyForm({...editingCurrencyForm, symbol: e.target.value})} />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <RateHistoryModal
                                                            history={curr.rates_history}
                                                            title={`${curr.code} — история курсов`}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-right space-x-2">
                                                        <button onClick={() => editCurrency(curr.id, editingCurrencyForm)} className="text-green-600 hover:text-green-800 text-sm font-medium">Сохранить</button>
                                                        <button onClick={() => setEditingCurrency(null)} className="text-gray-600 hover:text-gray-800 text-sm font-medium">Отмена</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3">{curr.code}</td>
                                                    <td className="px-4 py-3">{curr.name}</td>
                                                    <td className="px-4 py-3">{curr.symbol}</td>
                                                    <td className="px-4 py-3">
                                                        <RateHistoryModal
                                                            history={curr.rates_history}
                                                            title={`${curr.code} — история курсов`}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-3">
                                                        <button onClick={() => {setEditingCurrency(curr.id); setEditingCurrencyForm({code: curr.code, name: curr.name, symbol: curr.symbol})}} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Редактировать</button>
                                                        <button onClick={() => deleteCurrency(curr.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Удалить</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    {currencies.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-gray-500">Нет добавленных валют</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Установить курсы</h2>

                        <form onSubmit={createRate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select
                                required
                                className="input-field"
                                value={rateForm.currency_id}
                                onChange={(e) => setRateForm({...rateForm, currency_id: e.target.value})}
                            >
                                <option value="">Выберите валюту</option>
                                {currencies.map((curr) => (
                                    <option key={curr.id} value={curr.id}>
                                        {curr.code} - {curr.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                step="0.0001"
                                required
                                className="input-field"
                                placeholder="Курс покупки"
                                value={rateForm.buy_rate}
                                onChange={(e) => setRateForm({...rateForm, buy_rate: e.target.value})}
                            />
                            <input
                                type="number"
                                step="0.0001"
                                required
                                className="input-field"
                                placeholder="Курс продажи"
                                value={rateForm.sell_rate}
                                onChange={(e) => setRateForm({...rateForm, sell_rate: e.target.value})}
                            />
                            <button type="submit" className="btn-primary">Установить</button>
                        </form>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">История курсов</h2>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="table-header">
                                <tr>
                                    <th className="px-4 py-3 text-left">Дата</th>
                                    <th className="px-4 py-3 text-left">Валюта</th>
                                    <th className="px-4 py-3 text-right">Покупка</th>
                                    <th className="px-4 py-3 text-right">Продажа</th>
                                    <th className="px-4 py-3 text-right">Спред</th>
                                </tr>
                                </thead>
                                <tbody>
                                {rates.map((rate) => (
                                    <tr key={rate.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            {new Date(rate.effective_from).toLocaleString('ru-RU')}
                                        </td>
                                        <td className="px-4 py-3">{rate.currency_code}</td>
                                        <td className="px-4 py-3 text-right text-green-600">
                                            {rate.buy_rate.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600">
                                            {rate.sell_rate.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {(rate.sell_rate - rate.buy_rate).toFixed(4)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Параметры отчета</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Начало периода</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={reportDates.start_date}
                                    onChange={(e) => setReportDates({...reportDates, start_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Конец периода</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={reportDates.end_date}
                                    onChange={(e) => setReportDates({...reportDates, end_date: e.target.value})}
                                />
                            </div>
                            <button onClick={generateReport} className="btn-primary">
                                Сформировать отчет
                            </button>
                            <button onClick={downloadReportPdf} className="btn-secondary">
                                PDF
                            </button>
                        </div>
                    </div>

                    {stats.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Объемы операций по валютам</h3>
                                    <Bar data={getChartData()} options={{ responsive: true }} />
                                </div>

                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Распределение операций</h3>
                                    <Pie data={getPieData()} options={{ responsive: true }} />
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Детальная статистика</h3>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="table-header">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Валюта</th>
                                            <th className="px-4 py-3 text-right">Куплено (сумма)</th>
                                            <th className="px-4 py-3 text-right">Куплено (₽)</th>
                                            <th className="px-4 py-3 text-right">Продано (сумма)</th>
                                            <th className="px-4 py-3 text-right">Продано (₽)</th>
                                            <th className="px-4 py-3 text-right">Кол-во операций</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {stats.map((stat) => (
                                            <tr key={stat.currency_code} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{stat.currency_code}</td>
                                                <td className="px-4 py-3 text-right text-green-600">
                                                    {stat.total_buy_amount.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {stat.total_buy_rub.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-600">
                                                    {stat.total_sell_amount.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {stat.total_sell_rub.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {stat.operations_count}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'operations' && (
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Все операции</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="table-header">
                            <tr>
                                <th className="px-4 py-3 text-left">Дата</th>
                                <th className="px-4 py-3 text-left">Кассир</th>
                                <th className="px-4 py-3 text-left">Клиент</th>
                                <th className="px-4 py-3 text-left">Тип</th>
                                <th className="px-4 py-3 text-left">Валюта</th>
                                <th className="px-4 py-3 text-right">Сумма</th>
                                <th className="px-4 py-3 text-right">Курс</th>
                                <th className="px-4 py-3 text-right">Итого (₽)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {operations.map((op) => (
                                <tr key={op.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {new Date(op.created_at).toLocaleString('ru-RU')}
                                    </td>
                                    <td className="px-4 py-3">{op.cashier_name}</td>
                                    <td className="px-4 py-3">{op.client_name}</td>
                                    <td className={`px-4 py-3 font-medium ${op.operation_type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                                        {op.operation_type === 'buy' ? 'Покупка' : 'Продажа'}
                                    </td>
                                    <td className="px-4 py-3">{op.currency_code}</td>
                                    <td className="px-4 py-3 text-right">{op.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">{op.rate.toFixed(4)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{op.rub_amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
