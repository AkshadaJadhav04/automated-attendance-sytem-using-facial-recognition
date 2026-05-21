import { useState, useEffect } from 'react'
import { studentAPI } from '../api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiPhone, FiBookOpen } from 'react-icons/fi'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ roll_number: '', name: '', parent_contact: '', class_division: '', email: '' })

  useEffect(() => { loadStudents() }, [])

  const loadStudents = async () => {
    try {
      const res = await studentAPI.getAll()
      setStudents(res.data.students || [])
    } catch (err) {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (val) => {
    setSearch(val)
    if (val.length > 1) {
      const res = await studentAPI.search(val)
      setStudents(res.data.students || [])
    } else if (val.length === 0) {
      loadStudents()
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ roll_number: '', name: '', parent_contact: '', class_division: '', email: '' })
    setShowModal(true)
  }

  const openEdit = (student) => {
    setEditing(student)
    setForm({
      roll_number: student.roll_number,
      name: student.name,
      parent_contact: student.parent_contact,
      class_division: student.class_division,
      email: student.email || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await studentAPI.update(editing.id, form)
        toast.success('Student updated')
      } else {
        await studentAPI.create(form)
        toast.success('Student added')
      }
      setShowModal(false)
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return
    try {
      await studentAPI.delete(id)
      toast.success('Student deleted')
      loadStudents()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const filtered = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingSpinner text="Loading students..." />

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{students.length} total students</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Student
        </button>
      </div>

      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or roll number..."
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student, i) => (
          <div key={student.id} className={`glass-card p-5 animate-in-delay-${i % 4}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {student.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{student.roll_number}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(student)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-primary-500 transition-all">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => handleDelete(student.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-500 transition-all">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FiBookOpen size={14} />
                <span>{student.class_division}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FiPhone size={14} />
                <span>{student.parent_contact}</span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <FiUser className="mx-auto text-4xl mb-3 opacity-50" />
            <p>No students found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Edit Student' : 'Add New Student'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Roll Number</label>
                <input type="text" value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                  className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parent Contact</label>
                <input type="text" value={form.parent_contact} onChange={(e) => setForm({ ...form, parent_contact: e.target.value })}
                  className="input-field" required placeholder="+1234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class/Division</label>
                <input type="text" value={form.class_division} onChange={(e) => setForm({ ...form, class_division: e.target.value })}
                  className="input-field" required placeholder="e.g. SY-A" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (optional)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Update' : 'Add'} Student
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
