import { useState, useRef, useEffect } from 'react'
import { studentAPI } from '../api'
import toast from 'react-hot-toast'
import { FiCamera, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiUser } from 'react-icons/fi'

export default function FaceRegistration() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [samples, setSamples] = useState([])
  const [saving, setSaving] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    studentAPI.getAll().then((res) => setStudents(res.data.students || []))
  }, [])

  const startCamera = async () => {
    setShowCamera(true)
    setCameraError(false)
    setSamples([])
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      streamRef.current = stream
      setCameraReady(true)
    } catch {
      setCameraError(true)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
    setShowCamera(false)
  }

  const captureSample = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const imageSrc = canvas.toDataURL('image/jpeg', 0.8)
    setSamples((prev) => {
      if (prev.length >= 30) return prev
      return [...prev, imageSrc]
    })
  }

  const saveSamples = async () => {
    if (!selectedStudent || samples.length < 5) {
      toast.error('Select a student and capture at least 5 samples')
      return
    }
    setSaving(true)
    try {
      await studentAPI.captureSamples({ roll_number: selectedStudent, images: samples })
      toast.success(`Registered ${samples.length} face samples!`)
      setSamples([])
      stopCamera()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save samples')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Face Registration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Register student faces for attendance recognition</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiUser className="text-primary-500" /> Student Selection
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="input-field"
              >
                <option value="">Choose a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.roll_number}>
                    {s.roll_number} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="glass p-4 rounded-xl space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {students.find((s) => s.roll_number === selectedStudent)?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Capture 20-30 face samples for better accuracy
                </p>
              </div>
            )}

            {!showCamera ? (
              <button
                onClick={startCamera}
                disabled={!selectedStudent}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <FiCamera /> Start Camera
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="w-8 h-8 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
                      <div className="text-center">
                        <FiAlertCircle className="text-3xl mx-auto mb-2" />
                        <p className="text-sm">Camera not available</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={captureSample}
                    disabled={samples.length >= 30 || !cameraReady}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <FiCamera /> Capture ({samples.length}/30)
                  </button>
                  <button
                    onClick={stopCamera}
                    className="btn-secondary"
                  >
                    <FiRefreshCw />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCheckCircle className="text-primary-500" /> Captured Samples
          </h3>

          {samples.length > 0 ? (
            <div className="grid grid-cols-5 gap-2 mb-4 max-h-64 overflow-y-auto">
              {samples.map((sample, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <img src={sample} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FiCamera className="text-4xl mx-auto mb-3 opacity-50" />
              <p className="text-sm">No samples captured yet</p>
              <p className="text-xs mt-1">Open camera and capture face samples</p>
            </div>
          )}

          {samples.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="gradient-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(samples.length / 30) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">{samples.length}/30</span>
              </div>
              <button
                onClick={saveSamples}
                disabled={saving || samples.length < 5}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Face Data'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
