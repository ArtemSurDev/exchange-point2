import { useState, useEffect } from 'react'
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import RateHistoryModal from '../components/RateHistoryModal'

export default function ClientDashboard() {
    const [operations, setOperations] = useState([])
    const [currencies, setCurrencies] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [opsRes, currRes] = await Promise.all([
                api.get('/operations/my'),
                api.get('/currencies/')
            ])
            setOperations(opsRes.data)
            setCurrencies(currRes.data)
        } catch (error) {
            toast.error('Ошибка загрузки данных')
        } finally {
            setLoading(false)
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

    const getOperationTypeText = (type) => {
        return type === 'buy' ? 'Покупка' : 'Продажа'
    }

    const getOperationTypeColor = (type) => {
        return type === 'buy' ? 'text-green-600' : 'text-red-600'
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Личный кабинет</h1>
                <p className="text-sm sm:text-base text-gray-600">История ваших операций обмена валюты</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {currencies.map((currency) => (
                    <div key={currency.id} className="card">
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {currency.code} ({currency.name})
                            </h3>
                            <RateHistoryModal
                                history={currency.rates_history}
                                title={`${currency.code} — история курсов`}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Покупка:</span>
                                <span className="font-medium text-green-600">
                  {currency.current_buy_rate?.toFixed(4) || '—'} ₽
                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Продажа:</span>
                                <span className="font-medium text-red-600">
                  {currency.current_sell_rate?.toFixed(4) || '—'} ₽
                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
                    История операций
                </h2>

                {operations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">У вас пока нет операций</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm sm:text-base">
                            <thead className="table-header">
                            <tr>
                                <th className="px-4 py-3 text-left">Дата</th>
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
                                    <td className={`px-4 py-3 font-medium ${getOperationTypeColor(op.operation_type)}`}>
                                        {getOperationTypeText(op.operation_type)}
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
                )}
            </div>
        </div>
    )
}