import { NavLink, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../services/api.js'

export default function Navbar() {
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        ⚡ CABkaro
      </div>

      <div className="navbar-links">
        <NavLink to="/"        end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Home</NavLink>
        <NavLink to="/book"        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Book</NavLink>
        <NavLink to="/history"     className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>History</NavLink>
        <NavLink to="/support"     className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>💬</NavLink>
        <NavLink to="/profile"     className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>👤</NavLink>

        {user && (
          <button className="nav-logout" onClick={handleLogout}>Logout</button>
        )}
      </div>
    </nav>
  )
}
