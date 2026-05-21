import { useState, useEffect } from 'react'
import { timetableAPI, subjectAPI } from '../api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiPlus, FiTrash2, FiCalendar } from 'react-icons/fi'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Timetable() {
  const [timetable, setTimetable] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    day: 'Monday', subject_id: '', start_time: '09:00',
    end_time: '10:00', lecture_number: 1, class_division: ''
  })

  useEffect(() => {
    Promise.all([timetableAPI.getAll(), subjectAPI.getAll()])
      .then(([tt, subj]) => {
        setTimetable(tt.data.timetable || [])
        setSubjects(subj.data.subjects || [])
      })
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await timetableAPI.create(form)
      toast.success('Timetable entry added')
      setShowModal(false)
      const res = await timetableAPI.getAll()
      setTimetable(res.data.timetable || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add entry')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this timetable entry?')) return
    try {
      await timetableAPI.delete(id)
      toast.success('Entry deleted')
      setTimetable((prev) => prev.filter((t) => t.id !== id))
    } catch {
      toast.error('Delete failed')
    }
  }

  const getByDay = (day) => timetable.filter((t) => t.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (loading) return <LoadingSpinner text="Loading timetable..." />

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timetable</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage lecture schedule</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {DAYS.map((day) => {
          const entries = getByDay(day)
          return (
            <div key={day} className="glass-card p-4">
              <h3 className="font-semibold text-sm text-primary-500 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                {day}
              </h3>
              {entries.length > 0 ? (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="glass p-3 rounded-xl relative group">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{entry.subject_name}</p>
                          <p className="text-xs text-gray-500">{entry.start_time} - {entry.end_time}</p>
                          <p className="text-xs text-gray-400">L{entry.lecture_number} | {entry.class_division}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-all"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <FiCalendar className="mx-auto text-xl mb-1 opacity-50" />
                  <p className="text-xs">No lectures</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Add Timetable Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Day</label>
                  <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="input-field">
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lecture #</label>
                  <input type="number" min={1} value={form.lecture_number}
                    onChange={(e) => setForm({ ...form, lecture_number: parseInt(e.target.value) })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="input-field" required>
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class/Division</label>
                <input type="text" value={form.class_division}
                  onChange={(e) => setForm({ ...form, class_division: e.target.value })} className="input-field" placeholder="SY-A" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Add Entry</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
