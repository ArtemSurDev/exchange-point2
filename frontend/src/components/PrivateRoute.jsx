import { Navigate } from 'react-router-dom'

export default function PrivateRoute({ children, role }) {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
        return <Navigate to="/login" />
    }

    const user = JSON.parse(userStr)

    if (role && user.role !== role && user.role !== 'admin') {
        return <Navigate to={`/${user.role}`} />
    }

    return children
}