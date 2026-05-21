import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import FaceRegistration from './pages/FaceRegistration'
import Attendance from './pages/Attendance'
import Timetable from './pages/Timetable'
import Reports from './pages/Reports'
import SMSLogs from './pages/SMSLogs'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()
  if (loading) return <LoadingSpinner text="Authenticating..." />
  if (!admin) return <Navigate to="/login" replace />
  return children
}

function AppLayout({ children, title }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Navbar title={title} />
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/face-registration': 'Face Registration',
  '/attendance': 'Attendance',
  '/timetable': 'Timetable',
  '/reports': 'Reports',
  '/sms-logs': 'SMS Logs',
  '/settings': 'Settings',
}

function ProtectedPage({ children, path }) {
  return (
    <AppLayout title={pageTitles[path] || 'Dashboard'}>
      {children}
    </AppLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><ProtectedPage path="/dashboard"><Dashboard /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/students" element={
        <ProtectedRoute><ProtectedPage path="/students"><Students /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/face-registration" element={
        <ProtectedRoute><ProtectedPage path="/face-registration"><FaceRegistration /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/attendance" element={
        <ProtectedRoute><ProtectedPage path="/attendance"><Attendance /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/timetable" element={
        <ProtectedRoute><ProtectedPage path="/timetable"><Timetable /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute><ProtectedPage path="/reports"><Reports /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/sms-logs" element={
        <ProtectedRoute><ProtectedPage path="/sms-logs"><SMSLogs /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><ProtectedPage path="/settings"><Settings /></ProtectedPage></ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
