import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { FiUser, FiLock, FiSun, FiMoon, FiShield, FiAlertTriangle } from 'react-icons/fi'

export default function Settings() {
  const { admin } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    toast.success('Password changed successfully (demo)')
    setPasswords({ current: '', newPass: '', confirm: '' })
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure system preferences</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiUser className="text-primary-500" /> Profile
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {admin?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{admin?.username || 'Admin'}</p>
              <p className="text-sm text-gray-500">{admin?.email || 'admin@attendance.com'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiShield className="text-primary-500" /> Change Password
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <input type="password" value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input type="password" value={passwords.newPass}
              onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
              className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input type="password" value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="input-field" required />
          </div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {darkMode ? <FiMoon className="text-primary-500" /> : <FiSun className="text-primary-500" />}
          Appearance
        </h3>
        <div className="flex items-center justify-between max-w-md">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-gray-500">Toggle dark/light theme</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              darkMode ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 flex items-center justify-center ${
              darkMode ? 'left-7' : 'left-0.5'
            }`}>
              {darkMode ? <FiMoon size={12} /> : <FiSun size={12} />}
            </div>
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiAlertTriangle className="text-primary-500" /> System Info
        </h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Version: 1.0.0</p>
          <p>Smart Automated Attendance System Using Face Recognition</p>
          <p>Powered by React + Flask + OpenCV + face_recognition</p>
        </div>
      </div>
    </div>
  )
}
