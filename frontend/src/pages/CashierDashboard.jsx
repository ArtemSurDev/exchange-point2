import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import {
    MagnifyingGlassIcon,
    UserPlusIcon,
    BanknotesIcon,
    CreditCardIcon,
    DocumentTextIcon,
    ArrowDownTrayIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline'
import api from '../api/axios'
import PhoneInput from '../components/PhoneInput'
import RateHistoryModal from '../components/RateHistoryModal'

const createInitialQuickRegisterForm = (email = '') => ({
    email,
    password: '',
    full_name: '',
    phone: '',
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issue_date: '',
})

export default function CashierDashboard() {
    const [currencies, setCurrencies] = useState([])
    const [operations, setOperations] = useState([])
    const [searchEmail, setSearchEmail] = useState('')
    const [foundClient, setFoundClient] = useState(null)
    const [showQuickRegister, setShowQuickRegister] = useState(false)
    const [isEditingClient, setIsEditingClient] = useState(false)
    const [editClientForm, setEditClientForm] = useState(null)
    const [operationForm, setOperationForm] = useState({
        give_currency_id: 'RUB',
        receive_currency_id: '',
        amount: '',
        payment_method: 'cash'
    })
    const [quickRegisterForm, setQuickRegisterForm] = useState(createInitialQuickRegisterForm)
    const [activeTab, setActiveTab] = useState('operation')

    const mustUseCash = operationForm.give_currency_id !== 'RUB'

    useEffect(() => {
        if (mustUseCash && operationForm.payment_method !== 'cash') {
            setOperationForm((prev) => ({
                ...prev,
                payment_method: 'cash'
            }))
        }
    }, [mustUseCash, operationForm.payment_method])

    const getErrorDetail = (error, fallbackMessage) => {
        const detail = error?.response?.data?.detail
        if (Array.isArray(detail)) {
            return detail.map((item) => item?.msg).filter(Boolean).join('; ') || fallbackMessage
        }
        if (typeof detail === 'string' && detail.trim()) {
            return detail
        }
        return fallbackMessage
    }

    const getCurrencyById = (currencyId) => currencies.find((curr) => curr.id === Number(currencyId))


    const calculation = useMemo(() => {
        const giveAmount = parseFloat(operationForm.amount)
        if (!giveAmount || giveAmount <= 0) {
            return {
                canSubmit: false,
                receiveAmount: 0,
                rate: null,
                operationLabel: '',
                payload: null,
                error: 'Введите сумму обмена'
            }
        }

        if (!operationForm.give_currency_id || !operationForm.receive_currency_id) {
            return {
                canSubmit: false,
                receiveAmount: 0,
                rate: null,
                operationLabel: '',
                payload: null,
                error: 'Выберите обе валюты'
            }
        }

        if (operationForm.give_currency_id === operationForm.receive_currency_id) {
            return {
                canSubmit: false,
                receiveAmount: 0,
                rate: null,
                operationLabel: '',
                payload: null,
                error: 'Валюты должны отличаться'
            }
        }

        const giveIsRub = operationForm.give_currency_id === 'RUB'
        const receiveIsRub = operationForm.receive_currency_id === 'RUB'

        if (giveIsRub === receiveIsRub) {
            return {
                canSubmit: false,
                receiveAmount: 0,
                rate: null,
                operationLabel: '',
                payload: null,
                error: 'Одна из валют должна быть RUB'
            }
        }

        if (giveIsRub) {
            const receiveCurrency = getCurrencyById(operationForm.receive_currency_id)
            const sellRate = receiveCurrency?.current_sell_rate

            if (!sellRate) {
                return {
                    canSubmit: false,
                    receiveAmount: 0,
                    rate: null,
                    operationLabel: '',
                    payload: null,
                    error: 'Для выбранной валюты не задан курс продажи'
                }
            }

            const receiveAmount = giveAmount / sellRate
            return {
                canSubmit: true,
                receiveAmount,
                rate: sellRate,
                operationLabel: 'Покупка',
                payload: {
                    operation_type: 'buy',
                    currency_id: Number(operationForm.receive_currency_id),
                    amount: receiveAmount
                },
                error: ''
            }
        }

        const giveCurrency = getCurrencyById(operationForm.give_currency_id)
        const buyRate = giveCurrency?.current_buy_rate

        if (!buyRate) {
            return {
                canSubmit: false,
                receiveAmount: 0,
                rate: null,
                operationLabel: '',
                payload: null,
                error: 'Для выбранной валюты не задан курс покупки'
            }
        }

        const receiveAmount = giveAmount * buyRate
        return {
            canSubmit: true,
            receiveAmount,
            rate: buyRate,
            operationLabel: 'Продажа',
            payload: {
                operation_type: 'sell',
                currency_id: Number(operationForm.give_currency_id),
                amount: giveAmount
            },
            error: ''
        }
    }, [operationForm, currencies])

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        const refreshCurrencies = async () => {
            await fetchCurrencies()
        }

        const intervalId = setInterval(refreshCurrencies, 60000)
        window.addEventListener('focus', refreshCurrencies)

        return () => {
            clearInterval(intervalId)
            window.removeEventListener('focus', refreshCurrencies)
        }
    }, [])

    const applyCurrencies = (currencyList) => {
        setCurrencies(currencyList)
        setOperationForm((prev) => {
            if (prev.receive_currency_id === 'RUB') {
                return prev
            }
            const selectedCurrencyId = Number(prev.receive_currency_id)
            if (selectedCurrencyId && currencyList.some((curr) => curr.id === selectedCurrencyId)) {
                return prev
            }
            return {
                ...prev,
                receive_currency_id: currencyList.length > 0 ? String(currencyList[0].id) : ''
            }
        })
    }

    const fetchCurrencies = async () => {
        const response = await api.get('/currencies/')
        applyCurrencies(response.data)
    }

    const fetchData = async () => {
        try {
            const [currRes, opsRes] = await Promise.all([
                api.get('/currencies/'),
                api.get('/operations/my')
            ])
            applyCurrencies(currRes.data)
            setOperations(opsRes.data)
        } catch (error) {
            toast.error('Ошибка загрузки данных')
        }
    }

    const searchClient = async () => {
        if (!searchEmail) {
            toast.error('Введите email клиента')
            return
        }

        try {
            const response = await api.get(`/cashiers/clients/search?email=${searchEmail}`)
            setFoundClient(response.data)
            setShowQuickRegister(false)
            setIsEditingClient(false)
            toast.success('Клиент найден')
        } catch (error) {
            if (error.response?.status === 404) {
                toast.error('Клиент не найден')
                setFoundClient(null)
                setShowQuickRegister(true)
                setIsEditingClient(false)
                setQuickRegisterForm(createInitialQuickRegisterForm(searchEmail))
            } else {
                toast.error('Ошибка поиска')
            }
        }
    }

    const startEditingClient = () => {
        setEditClientForm({ ...foundClient })
        setIsEditingClient(true)
    }

    const cancelEditClient = () => {
        setIsEditingClient(false)
        setEditClientForm(null)
    }

    const handleEditClient = async (e) => {
        e.preventDefault()

        try {
            const response = await api.put(`/cashiers/clients/${foundClient.id}`, editClientForm)
            setFoundClient({ ...foundClient, ...response.data })
            setIsEditingClient(false)
            toast.success('Данные клиента обновлены')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка обновления клиента')
        }
    }

    const handleQuickRegister = async (e) => {
        e.preventDefault()

        try {
            const response = await api.post('/cashiers/clients/quick-register', quickRegisterForm)
            setFoundClient(response.data)
            setShowQuickRegister(false)
            toast.success('Клиент зарегистрирован')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка регистрации')
        }
    }

    const handleCreateOperation = async (e) => {
        e.preventDefault()

        if (!foundClient) {
            toast.error('Сначала найдите клиента')
            return
        }

        if (!operationForm.amount || !operationForm.give_currency_id || !operationForm.receive_currency_id) {
            toast.error('Заполните все поля операции')
            return
        }

        if (!calculation.canSubmit || !calculation.payload) {
            toast.error(calculation.error || 'Некорректные параметры обмена')
            return
        }

        let response
        try {
            response = await api.post('/operations/', {
                ...calculation.payload,
                payment_method: operationForm.payment_method,
                client_email: foundClient.email,
            })
        } catch (error) {
            toast.error(getErrorDetail(error, 'Ошибка создания операции'))
            return
        }

        toast.success('Операция выполнена успешно')
        setOperations((prev) => [response.data, ...prev])
        setOperationForm((prev) => ({
            ...prev,
            amount: ''
        }))

        try {
            const receiptResponse = await api.get(`/operations/receipt/${response.data.id}`, {
                responseType: 'blob'
            })
            const url = window.URL.createObjectURL(new Blob([receiptResponse.data], { type: 'application/pdf' }))
            window.open(url, '_blank')
        } catch (error) {
            toast.error('Операция создана, но чек открыть не удалось')
        }
    }

    const downloadReceipt = async (operationId) => {
        try {
            const response = await api.get(`/operations/receipt/${operationId}`, {
                responseType: 'blob'
            })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `receipt_${operationId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            toast.error('Ошибка скачивания чека')
        }
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Панель кассира</h1>

            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('operation')}
                    className={`px-6 py-3 font-medium transition ${
                        activeTab === 'operation'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Новая операция
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 font-medium transition ${
                        activeTab === 'history'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    История операций
                </button>
            </div>

            {activeTab === 'operation' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Поиск клиента</h2>

                        <div className="flex space-x-2 mb-4">
                            <input
                                type="email"
                                className="input-field flex-1"
                                placeholder="Email клиента"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchClient()}
                            />
                            <button onClick={searchClient} className="btn-primary">
                                <MagnifyingGlassIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {foundClient && !isEditingClient && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 relative">
                                <button onClick={startEditingClient} className="absolute top-4 right-4 text-blue-600 hover:text-blue-800" title="Редактировать клиента">
                                    <PencilSquareIcon className="h-5 w-5" />
                                </button>
                                <h3 className="font-semibold text-green-800 mb-2">Клиент найден</h3>
                                <p><strong>ФИО:</strong> {foundClient.full_name}</p>
                                <p><strong>Email:</strong> {foundClient.email}</p>
                                <p><strong>Телефон:</strong> {foundClient.phone || '—'}</p>
                                <p><strong>Паспорт:</strong> {foundClient.passport_series} {foundClient.passport_number}</p>
                            </div>
                        )}

                        {isEditingClient && (
                            <div className="bg-white border rounded-lg p-4 mb-4">
                                <h3 className="font-semibold mb-3">Редактирование клиента</h3>
                                <form onSubmit={handleEditClient} className="space-y-3">
                                    <input type="text" required className="input-field" placeholder="ФИО" 
                                        value={editClientForm.full_name} onChange={(e) => setEditClientForm({...editClientForm, full_name: e.target.value})} />
                                    <PhoneInput value={editClientForm.phone} onChange={(val) => setEditClientForm({...editClientForm, phone: val})} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" maxLength="4" className="input-field" placeholder="Серия паспорта"
                                            value={editClientForm.passport_series} onChange={(e) => setEditClientForm({...editClientForm, passport_series: e.target.value})} />
                                        <input type="text" maxLength="6" className="input-field" placeholder="Номер паспорта"
                                            value={editClientForm.passport_number} onChange={(e) => setEditClientForm({...editClientForm, passport_number: e.target.value})} />
                                    </div>
                                    <div className="flex space-x-2">
                                        <button type="submit" className="btn-primary flex-1">Сохранить</button>
                                        <button type="button" onClick={cancelEditClient} className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 flex-1">Отмена</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {showQuickRegister && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
                                    <UserPlusIcon className="h-5 w-5 mr-2" />
                                    Быстрая регистрация клиента
                                </h3>

                                <form onSubmit={handleQuickRegister} className="space-y-3">
                                    <input
                                        type="email"
                                        required
                                        className="input-field"
                                        placeholder="Email"
                                        value={quickRegisterForm.email}
                                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, email: e.target.value})}
                                    />

                                    <input
                                        type="text"
                                        required
                                        className="input-field"
                                        placeholder="ФИО"
                                        value={quickRegisterForm.full_name}
                                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, full_name: e.target.value})}
                                    />

                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="password"
                                            minLength={8}
                                            className="input-field"
                                            placeholder="Пароль (опционально)"
                                            value={quickRegisterForm.password}
                                            onChange={(e) => setQuickRegisterForm({...quickRegisterForm, password: e.target.value})}
                                        />
                                        <PhoneInput 
                                            value={quickRegisterForm.phone}
                                            onChange={(val) => setQuickRegisterForm({...quickRegisterForm, phone: val})}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            maxLength="4"
                                            className="input-field"
                                            placeholder="Серия паспорта"
                                            value={quickRegisterForm.passport_series}
                                            onChange={(e) => setQuickRegisterForm({...quickRegisterForm, passport_series: e.target.value})}
                                        />
                                        <input
                                            type="text"
                                            maxLength="6"
                                            className="input-field"
                                            placeholder="Номер паспорта"
                                            value={quickRegisterForm.passport_number}
                                            onChange={(e) => setQuickRegisterForm({...quickRegisterForm, passport_number: e.target.value})}
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Кем выдан"
                                        value={quickRegisterForm.passport_issued_by}
                                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, passport_issued_by: e.target.value})}
                                    />

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Дата выдачи паспорта</label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={quickRegisterForm.passport_issue_date}
                                            onChange={(e) => setQuickRegisterForm({...quickRegisterForm, passport_issue_date: e.target.value})}
                                        />
                                    </div>

                                    <button type="submit" className="btn-primary w-full">
                                        Зарегистрировать клиента
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                        <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Новая операция</h2>

                        <form onSubmit={handleCreateOperation} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Клиент отдаёт</label>
                                <select
                                    required
                                    className="input-field"
                                    value={operationForm.give_currency_id}
                                    onChange={(e) => setOperationForm({...operationForm, give_currency_id: e.target.value})}
                                >
                                    <option value="RUB">RUB - Российский рубль</option>
                                    {currencies.map((curr) => (
                                        <option key={curr.id} value={curr.id}>
                                            {curr.code} - {curr.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Клиент получает</label>
                                <select
                                    required
                                    className="input-field"
                                    value={operationForm.receive_currency_id}
                                    onChange={(e) => setOperationForm({...operationForm, receive_currency_id: e.target.value})}
                                >
                                    <option value="">Выберите валюту</option>
                                    <option value="RUB">RUB - Российский рубль</option>
                                    {currencies.map((curr) => (
                                        <option key={curr.id} value={curr.id}>
                                            {curr.code} - {curr.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма, которую клиент отдаёт</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    className="input-field"
                                    placeholder="Введите сумму"
                                    value={operationForm.amount}
                                    onChange={(e) => setOperationForm({...operationForm, amount: e.target.value})}
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                <p>
                                    <strong>Тип операции:</strong>{' '}
                                    {calculation.operationLabel || '—'}
                                </p>
                                <p>
                                    <strong>Курс:</strong>{' '}
                                    {calculation.rate ? calculation.rate.toFixed(4) : '—'}
                                </p>
                                <p>
                                    <strong>Клиент получит:</strong>{' '}
                                    {calculation.receiveAmount > 0 ? calculation.receiveAmount.toFixed(2) : '—'}
                                </p>
                                {!calculation.canSubmit && (
                                    <p className="text-red-600 mt-1">{calculation.error}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Способ оплаты</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="cash"
                                            checked={operationForm.payment_method === 'cash'}
                                            onChange={(e) => setOperationForm({...operationForm, payment_method: e.target.value})}
                                            className="mr-2"
                                        />
                                        <BanknotesIcon className="h-5 w-5 mr-1 text-green-600" />
                                        <span>Наличные</span>
                                    </label>
                                    <label className={`flex items-center ${mustUseCash ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="radio"
                                            value="card"
                                            checked={operationForm.payment_method === 'card'}
                                            onChange={(e) => setOperationForm({...operationForm, payment_method: e.target.value})}
                                            className="mr-2"
                                            disabled={mustUseCash}
                                        />
                                        <CreditCardIcon className="h-5 w-5 mr-1 text-blue-600" />
                                        <span>Карта</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!foundClient || !calculation.canSubmit}
                                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Выполнить операцию
                            </button>
                        </form>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Курсы и история</h2>
                        {currencies.length === 0 ? (
                            <p className="text-gray-500">Курсы пока не установлены.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="table-header">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Код</th>
                                        <th className="px-4 py-3 text-right">Покупка</th>
                                        <th className="px-4 py-3 text-right">Продажа</th>
                                        <th className="px-4 py-3 text-left">История</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currencies.map((currency) => (
                                        <tr key={currency.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold">{currency.code}</td>
                                            <td className="px-4 py-3 text-right text-green-600">
                                                {currency.current_buy_rate ? currency.current_buy_rate.toFixed(4) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600">
                                                {currency.current_sell_rate ? currency.current_sell_rate.toFixed(4) : '—'}
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
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
                        История моих операций
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="table-header">
                            <tr>
                                <th className="px-4 py-3 text-left">Дата</th>
                                <th className="px-4 py-3 text-left">Клиент</th>
                                <th className="px-4 py-3 text-left">Тип</th>
                                <th className="px-4 py-3 text-left">Валюта</th>
                                <th className="px-4 py-3 text-right">Сумма</th>
                                <th className="px-4 py-3 text-right">Курс</th>
                                <th className="px-4 py-3 text-right">Итого (₽)</th>
                                <th className="px-4 py-3 text-center">Чек</th>
                            </tr>
                            </thead>
                            <tbody>
                            {operations.map((op) => (
                                <tr key={op.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {new Date(op.created_at).toLocaleString('ru-RU')}
                                    </td>
                                    <td className="px-4 py-3">{op.client_name}</td>
                                    <td className={`px-4 py-3 font-medium ${op.operation_type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                                        {op.operation_type === 'buy' ? 'Покупка' : 'Продажа'}
                                    </td>
                                    <td className="px-4 py-3">{op.currency_code}</td>
                                    <td className="px-4 py-3 text-right">{op.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">{op.rate.toFixed(4)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{op.rub_amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => downloadReceipt(op.id)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Скачать чек"
                                        >
                                            <ArrowDownTrayIcon className="h-5 w-5" />
                                        </button>
                                    </td>
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




