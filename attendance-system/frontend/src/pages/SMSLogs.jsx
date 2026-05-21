import { useState, useEffect } from 'react'
import { smsAPI } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiMessageSquare, FiCheckCircle, FiXCircle } from 'react-icons/fi'

export default function SMSLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    smsAPI.getLogs()
      .then((res) => setLogs(res.data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading SMS logs..." />

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Logs</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Parent notification history</p>
      </div>

      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Subject</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4">{log.lecture_date}</td>
                  <td className="py-3 px-4 font-medium">{log.student_name}</td>
                  <td className="py-3 px-4">{log.parent_contact}</td>
                  <td className="py-3 px-4">{log.subject_name}</td>
                  <td className="py-3 px-4">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${
                      log.status === 'sent' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {log.status === 'sent' ? <FiCheckCircle /> : <FiXCircle />}
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{log.sent_at}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No SMS logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
