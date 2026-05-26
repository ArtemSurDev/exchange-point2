import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

export default function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const formDataObj = new FormData()
      formDataObj.append('username', formData.username)
      formDataObj.append('password', formData.password)
      
      const response = await api.post('/auth/login', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      localStorage.setItem('token', response.data.access_token)
      const userResponse = await api.get('/auth/me')
      localStorage.setItem('user', JSON.stringify(userResponse.data))

      const role = userResponse.data.role
      if (role === 'admin') window.location.href = '/admin'
      else if (role === 'cashier') window.location.href = '/cashier'
      else window.location.href = '/client'
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', background: 'white', borderRadius: '10px' }}>
      <h1 style={{ color: '#1e3a8a', textAlign: 'center' }}>Вход</h1>
      {error && <div style={{ background: '#fee', color: '#c00', padding: '10px', borderRadius: '5px' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" required style={inputStyle}
          value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
        <input type="password" placeholder="Пароль" required style={inputStyle}
          value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        <Link to="/register">Регистрация</Link>
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '12px', margin: '10px 0', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }
const buttonStyle = { width: '100%', margin: '10px 0', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }
