import { useMemo, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { ChartBarIcon } from '@heroicons/react/24/outline'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            position: 'bottom'
        },
        tooltip: {
            callbacks: {
                label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(4)} ₽`
            }
        }
    },
    scales: {
        x: {
            position: 'top',
            ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6
            }
        },
        y: {
            position: 'right'
        }
    }
}

export default function RateHistoryModal({ history = [], title = 'История курсов' }) {
    const [open, setOpen] = useState(false)
    const hasHistory = Array.isArray(history) && history.length > 0

    const chartData = useMemo(() => {
        if (!hasHistory) {
            return null
        }
        const sorted = [...history].sort((a, b) => new Date(a.effective_from) - new Date(b.effective_from))
        return {
            labels: sorted.map((item) => new Date(item.effective_from).toLocaleDateString('ru-RU')),
            datasets: [
                {
                    label: 'Покупка',
                    data: sorted.map((item) => item.buy_rate),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.3
                },
                {
                    label: 'Продажа',
                    data: sorted.map((item) => item.sell_rate),
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.3
                }
            ]
        }
    }, [history, hasHistory])

    return (
        <>
            <button
                type="button"
                className={`inline-flex items-center justify-center ${hasHistory ? 'text-blue-600 hover:text-blue-800' : 'text-gray-300 cursor-not-allowed'}`}
                onClick={() => hasHistory && setOpen(true)}
                title={hasHistory ? 'Показать историю' : 'История отсутствует'}
                aria-label="История курсов"
            >
                <ChartBarIcon className="h-5 w-5" />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                            <button
                                type="button"
                                className="text-sm text-gray-600 hover:text-gray-800"
                                onClick={() => setOpen(false)}
                            >
                                Закрыть
                            </button>
                        </div>
                        {chartData ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <p className="text-gray-500">История курсов пока недоступна.</p>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

