import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import PhoneInput from '../components/PhoneInput'

export default function Profile() {
    const [profile, setProfile] = useState({
        email: '',
        full_name: '',
        phone: '',
        passport_series: '',
        passport_number: '',
        passport_issued_by: '',
        passport_issue_date: ''
    })
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await api.get('/auth/me')
                const me = response.data
                setProfile({
                    email: me.email || '',
                    full_name: me.full_name || '',
                    phone: me.phone || '',
                    passport_series: me.passport_series || '',
                    passport_number: me.passport_number || '',
                    passport_issued_by: me.passport_issued_by || '',
                    passport_issue_date: me.passport_issue_date || ''
                })
            } catch (err) {
                console.error(err)
                toast.error('Ошибка загрузки профиля')
            } finally {
                setLoading(false)
            }
        }

        loadProfile()
    }, [])

    const saveProfile = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                email: profile.email,
                full_name: profile.full_name,
                phone: profile.phone || null,
                passport_series: profile.passport_series || null,
                passport_number: profile.passport_number || null,
                passport_issued_by: profile.passport_issued_by || null,
                passport_issue_date: profile.passport_issue_date || null
            }
            const response = await api.patch('/auth/me', payload)
            localStorage.setItem('user', JSON.stringify(response.data))
            window.dispatchEvent(new Event('user-updated'))
            toast.success('Профиль обновлен')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка обновления профиля')
        }
    }

    const changePassword = async (e) => {
        e.preventDefault()
        if (passwordForm.new_password.length < 8) {
            toast.error('Новый пароль должен быть не короче 8 символов')
            return
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.error('Новый пароль и подтверждение не совпадают')
            return
        }

        try {
            await api.post('/auth/me/change-password', {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            })
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: ''
            })
            toast.success('Пароль успешно изменён')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Ошибка смены пароля')
        }
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : {}
    const isClient = user.role === 'client'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Личный кабинет</h1>
                <p className="text-gray-600">Изменение персональных данных и пароля</p>
            </div>

            <div className="card">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Данные профиля</h2>
                <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="email" required className="input-field" placeholder="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                    <input type="text" required className="input-field" placeholder="ФИО" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                    {isClient && (
                        <>
                            <PhoneInput className="input-field" placeholder="Телефон" value={profile.phone} onChange={(val) => setProfile({ ...profile, phone: val })} />
                            <input type="text" maxLength={4} className="input-field" placeholder="Серия паспорта" value={profile.passport_series} onChange={(e) => setProfile({ ...profile, passport_series: e.target.value })} />
                            <input type="text" maxLength={6} className="input-field" placeholder="Номер паспорта" value={profile.passport_number} onChange={(e) => setProfile({ ...profile, passport_number: e.target.value })} />
                            <input type="text" className="input-field" placeholder="Кем выдан паспорт" value={profile.passport_issued_by} onChange={(e) => setProfile({ ...profile, passport_issued_by: e.target.value })} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Дата выдачи паспорта</label>
                                <input type="date" className="input-field" value={profile.passport_issue_date} onChange={(e) => setProfile({ ...profile, passport_issue_date: e.target.value })} />
                            </div>
                        </>
                    )}
                    <div className="md:col-span-2">
                        <button type="submit" className="btn-primary">Сохранить изменения</button>
                    </div>
                </form>
            </div>

            <div className="card">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Смена пароля</h2>
                <form onSubmit={changePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="password" required className="input-field" placeholder="Текущий пароль" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} />
                    <input type="password" required minLength={8} className="input-field" placeholder="Новый пароль" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                    <input type="password" required minLength={8} className="input-field" placeholder="Подтверждение пароля" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                    <div className="md:col-span-3">
                        <button type="submit" className="btn-primary">Обновить пароль</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
