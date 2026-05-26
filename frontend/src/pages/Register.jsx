import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import PhoneInput from '../components/PhoneInput'

export default function Register() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        passport_series: '',
        passport_number: '',
        passport_issued_by: '',
        passport_issue_date: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            await api.post('/auth/register', formData)
            setSuccess('Регистрация успешна! Перенаправление на вход...')
            setTimeout(() => navigate('/login'), 2000)
        } catch (error) {
            setError(error.response?.data?.detail || 'Ошибка регистрации')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="px-4">
            <div className="max-w-md mx-auto mt-8 sm:mt-12 bg-white rounded-xl shadow p-6 sm:p-8">
                <h1 className="text-2xl sm:text-3xl text-blue-800 text-center font-semibold">Регистрация клиента</h1>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mt-4">{error}</div>}
                {success && <div className="bg-green-50 text-green-600 p-3 rounded-md mt-4">{success}</div>}

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <input type="email" placeholder="Email *" required className="input-field"
                           value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />

                    <input type="password" placeholder="Пароль *" required minLength={8} className="input-field"
                           value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />

                    <input type="text" placeholder="ФИО *" required className="input-field"
                           value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />

                    <PhoneInput 
                           value={formData.phone} 
                           onChange={(val) => setFormData({...formData, phone: val})}
                           className="input-field"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" placeholder="Серия паспорта *" required maxLength={4} className="input-field"
                               value={formData.passport_series} onChange={(e) => setFormData({...formData, passport_series: e.target.value})} />
                        <input type="text" placeholder="Номер паспорта *" required maxLength={6} className="input-field"
                               value={formData.passport_number} onChange={(e) => setFormData({...formData, passport_number: e.target.value})} />
                    </div>

                    <input type="text" placeholder="Кем выдан паспорт *" required className="input-field"
                           value={formData.passport_issued_by} onChange={(e) => setFormData({...formData, passport_issued_by: e.target.value})} />

                    <label className="block text-sm text-gray-600">
                        Дата выдачи паспорта *
                    </label>
                    <input type="date" required className="input-field"
                           value={formData.passport_issue_date} onChange={(e) => setFormData({...formData, passport_issue_date: e.target.value})} />

                    <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>

                <p className="text-center mt-4">
                    <Link to="/login">← Назад ко входу</Link>
                </p>
            </div>
        </div>
     )
 }
