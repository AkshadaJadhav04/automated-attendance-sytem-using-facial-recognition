import { useState, useEffect } from 'react'
import { dashboardAPI, attendanceAPI } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiUsers, FiCheckCircle, FiXCircle, FiTrendingUp, FiCalendar, FiClock } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [subjectStats, setSubjectStats] = useState([])
  const [recentAttendance, setRecentAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, subjectRes, recentRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getSubjectStats(),
        dashboardAPI.getRecentAttendance(),
      ])
      setStats(statsRes.data)
      setSubjectStats(subjectRes.data.subjects || [])
      setRecentAttendance(recentRes.data.records || [])
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  const pieData = [
    { name: 'Present', value: stats?.present || 0 },
    { name: 'Absent', value: stats?.absent || 0 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FiUsers}
          label="Total Students"
          value={stats?.total_students || 0}
          color="from-primary-500 to-purple-600"
          delay={0}
        />
        <StatCard
          icon={FiCheckCircle}
          label="Present Today"
          value={stats?.present || 0}
          color="from-green-500 to-emerald-600"
          delay={1}
        />
        <StatCard
          icon={FiXCircle}
          label="Absent Today"
          value={stats?.absent || 0}
          color="from-red-500 to-rose-600"
          delay={2}
        />
        <StatCard
          icon={FiTrendingUp}
          label="Attendance %"
          value={`${stats?.percentage || 0}%`}
          color="from-blue-500 to-cyan-600"
          delay={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCalendar className="text-primary-500" /> Today's Attendance Overview
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Absent</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-primary-500" /> Subject-wise Attendance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="subject_name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_present" fill="#6366f1" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="total_classes" fill="#22c55e" radius={[4, 4, 0, 0]} name="Total Classes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiClock className="text-primary-500" /> Recent Attendance Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Student</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Roll No</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.map((record, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4">{record.date}</td>
                  <td className="py-3 px-4">{record.time}</td>
                  <td className="py-3 px-4 font-medium">{record.name}</td>
                  <td className="py-3 px-4">{record.roll_number}</td>
                  <td className="py-3 px-4">{record.subject_name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.status === 'present'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentAttendance.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No recent attendance records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <div className={`stat-card animate-in-delay-${delay}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="text-white text-xl" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}
