import { NavLink } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { FiGrid, FiUsers, FiCamera, FiClock, FiBarChart2, FiSettings, FiLogOut, FiSun, FiMoon, FiCalendar, FiMessageSquare } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/students', icon: FiUsers, label: 'Students' },
  { to: '/face-registration', icon: FiCamera, label: 'Face Registration' },
  { to: '/attendance', icon: FiClock, label: 'Attendance' },
  { to: '/timetable', icon: FiCalendar, label: 'Timetable' },
  { to: '/reports', icon: FiBarChart2, label: 'Reports' },
  { to: '/sms-logs', icon: FiMessageSquare, label: 'SMS Logs' },
  { to: '/settings', icon: FiSettings, label: 'Settings' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { darkMode, toggleDarkMode } = useTheme()
  const { logout } = useAuth()

  return (
    <aside
      className={`glass-sidebar fixed left-0 top-0 h-screen z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center gap-3 p-5 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <FiCamera className="text-white text-lg" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm gradient-text">Smart Attendance</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Face Recognition</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'gradient-primary text-white shadow-lg shadow-primary-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="text-xl flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200/50 dark:border-gray-800/50 space-y-1">
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          {darkMode ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
          {!collapsed && <span className="text-sm font-medium">Theme</span>}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <FiLogOut className="text-xl" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full glass border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
      >
        <svg className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  )
}
