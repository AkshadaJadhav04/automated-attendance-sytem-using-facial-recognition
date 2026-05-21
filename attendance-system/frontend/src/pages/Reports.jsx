import { useState, useEffect } from 'react'
import { reportAPI, subjectAPI, studentAPI, attendanceAPI } from '../api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiDownload, FiFileText, FiCalendar, FiUser, FiBookOpen, FiSearch } from 'react-icons/fi'
import { saveAs } from 'file-saver'

export default function Reports() {
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('daily')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [reportData, setReportData] = useState([])
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    Promise.all([subjectAPI.getAll(), studentAPI.getAll()])
      .then(([subj, stu]) => {
        setSubjects(subj.data.subjects || [])
        setStudents(stu.data.students || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const generateReport = async () => {
    setLoadingReport(true)
    try {
      let res
      switch (reportType) {
        case 'daily': {
          const r = await attendanceAPI.getRange({ start_date: date, end_date: date })
          setReportData(r.data.records || [])
          break
        }
        case 'monthly': {
          const start = `${year}-${String(month).padStart(2, '0')}-01`
          const end = new Date(year, month, 0).toISOString().split('T')[0]
          const r = await attendanceAPI.getRange({ start_date: start, end_date: end })
          setReportData(r.data.records || [])
          break
        }
        case 'subject': {
          if (!selectedSubject) { toast.error('Select a subject'); return }
          const r = await attendanceAPI.getBySubject(selectedSubject)
          setReportData(r.data.records || [])
          break
        }
        case 'student': {
          if (!selectedStudent) { toast.error('Select a student'); return }
          const r = await studentAPI.getAttendance(selectedStudent)
          setReportData(r.data.records || [])
          break
        }
      }
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setLoadingReport(false)
    }
  }

  const downloadReport = async (format) => {
    try {
      let blob
      const columns = ['Date', 'Time', 'Roll Number', 'Name', 'Class', 'Subject', 'Lecture', 'Status', 'Confidence']
      const rows = reportData.map((r) => [
        r.date, r.time, r.roll_number || '', r.name || '', r.class_division || '',
        r.subject_name || '', r.lecture_number || '', r.status, r.confidence_score || 'N/A'
      ])

      if (format === 'csv') {
        switch (reportType) {
          case 'daily': {
            const r = await reportAPI.daily({ date })
            blob = r.data
            break
          }
          case 'monthly': {
            const r = await reportAPI.monthly({ year, month })
            blob = r.data
            break
          }
          case 'student': {
            if (!selectedStudent) return
            const r = await reportAPI.student(selectedStudent)
            blob = r.data
            break
          }
          case 'subject': {
            if (!selectedSubject) return
            const r = await reportAPI.subject(selectedSubject)
            blob = r.data
            break
          }
          default: return
        }
        saveAs(blob, `report.${format}`)
        toast.success('Report downloaded')
      } else if (format === 'excel') {
        const r = await reportAPI.exportExcel({ columns, rows })
        saveAs(r.data, `attendance_report.xlsx`)
        toast.success('Excel report downloaded')
      } else if (format === 'pdf') {
        const r = await reportAPI.exportPDF({ columns, rows })
        saveAs(r.data, `attendance_report.pdf`)
        toast.success('PDF report downloaded')
      }
    } catch {
      toast.error('Download failed')
    }
  }

  if (loading) return <LoadingSpinner text="Loading reports..." />

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generate and download attendance reports</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { id: 'daily', label: 'Daily', icon: FiCalendar },
            { id: 'monthly', label: 'Monthly', icon: FiCalendar },
            { id: 'subject', label: 'Subject-wise', icon: FiBookOpen },
            { id: 'student', label: 'Student-wise', icon: FiUser },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setReportType(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                reportType === id
                  ? 'gradient-primary text-white shadow-lg shadow-primary-500/25'
                  : 'glass border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {reportType === 'daily' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
            </div>
          )}
          {reportType === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input-field w-24" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="input-field">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {reportType === 'subject' && (
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input-field">
                <option value="">Select...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject_name}</option>
                ))}
              </select>
            </div>
          )}
          {reportType === 'student' && (
            <div>
              <label className="block text-sm font-medium mb-1">Student</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="input-field">
                <option value="">Select...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={generateReport} disabled={loadingReport} className="btn-primary flex items-center gap-2">
            <FiSearch /> {loadingReport ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Results ({reportData.length} records)</h3>
            <div className="flex gap-2">
              <button onClick={() => downloadReport('csv')} className="btn-secondary text-sm flex items-center gap-1">
                <FiDownload /> CSV
              </button>
              <button onClick={() => downloadReport('excel')} className="btn-secondary text-sm flex items-center gap-1">
                <FiDownload /> Excel
              </button>
              <button onClick={() => downloadReport('pdf')} className="btn-secondary text-sm flex items-center gap-1">
                <FiDownload /> PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Student</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">{r.date}</td>
                    <td className="py-2 px-3">{r.time}</td>
                    <td className="py-2 px-3">
                      <span className="font-medium">{r.name || r.student_name}</span>
                      <span className="text-gray-400 ml-1">({r.roll_number})</span>
                    </td>
                    <td className="py-2 px-3">{r.subject_name}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'present'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-2 px-3">{r.confidence_score ? `${r.confidence_score}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData.length === 0 && !loadingReport && (
        <div className="text-center py-12 text-gray-500">
          <FiFileText className="text-4xl mx-auto mb-3 opacity-50" />
          <p>Generate a report to see data</p>
        </div>
      )}
    </div>
  )
}
