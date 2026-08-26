import { NavLink, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../services/api.js'
import { IconSupport, IconUser, IconLogout, IconHistory, IconRide } from './icons.jsx'

export default function Navbar() {
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div
        className="navbar-logo"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <img
          src="/logo.png"
          alt="CABkaro"
          style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
        />
        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>CAB</span>
        <span style={{ color: 'var(--text)', fontWeight: 400, marginLeft: -6 }}>karo</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/book" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Book
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          History
        </NavLink>
        <NavLink
          to="/support"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <IconSupport size={16} />
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <IconUser size={16} />
        </NavLink>

        {user && (
          <button
            className="nav-logout"
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconLogout size={14} />
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}
