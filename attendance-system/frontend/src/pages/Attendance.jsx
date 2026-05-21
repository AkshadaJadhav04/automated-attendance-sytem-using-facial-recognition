import { useState, useEffect, useRef, useCallback } from 'react'
import { attendanceAPI, timetableAPI } from '../api'
import toast from 'react-hot-toast'
import { FiCamera, FiRefreshCw, FiCheckCircle, FiXCircle, FiAlertTriangle, FiClock, FiUser, FiSend } from 'react-icons/fi'

export default function Attendance() {
  const [currentLecture, setCurrentLecture] = useState(null)
  const [todayRecords, setTodayRecords] = useState([])
  const [cameraActive, setCameraActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [absentStudents, setAbsentStudents] = useState([])
  const [sendingSMS, setSendingSMS] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    loadLecture()
    loadTodayRecords()
  }, [])

  const loadLecture = async () => {
    try {
      const res = await timetableAPI.getCurrentLecture()
      setCurrentLecture(res.data.lecture)
    } catch {}
  }

  const loadTodayRecords = async () => {
    try {
      const res = await attendanceAPI.getToday()
      setTodayRecords(res.data.records || [])
    } catch {}
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      streamRef.current = stream
      setCameraActive(true)
      toast.success('Camera activated')
    } catch {
      toast.error('Camera access denied')
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
    setCameraActive(false)
    setScanning(false)
  }

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || scanning) return
    setScanning(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.8)

    try {
      const res = await attendanceAPI.mark({ image: imageData, lecture_id: currentLecture?.id })
      setLastResult({ success: true, ...res.data })
      toast.success(`Marked: ${res.data.student?.name}`)
      loadTodayRecords()
    } catch (err) {
      const errorData = err.response?.data || {}
      if (errorData.mask_detected) {
        setLastResult({ success: false, error: 'Please remove mask', mask: true })
      } else if (errorData.duplicate) {
        setLastResult({ success: false, error: 'Already marked', duplicate: true })
      } else if (errorData.unknown) {
        setLastResult({ success: false, error: 'Face not recognized', unknown: true })
      } else {
        setLastResult({ success: false, error: errorData.error || 'Recognition failed' })
      }
    } finally {
      setScanning(false)
    }
  }, [scanning, currentLecture])

  useEffect(() => {
    let interval
    if (cameraActive && currentLecture) {
      interval = setInterval(captureAndRecognize, 3000)
    }
    return () => clearInterval(interval)
  }, [cameraActive, currentLecture, captureAndRecognize])

  const loadAbsentStudents = async () => {
    try {
      const res = await attendanceAPI.getAbsentStudents()
      setAbsentStudents(res.data.students || [])
    } catch {}
  }

  const sendSMSAlerts = async () => {
    setSendingSMS(true)
    try {
      await attendanceAPI.sendSMS({})
      toast.success('SMS notifications sent to parents')
    } catch (err) {
      toast.error(err.response?.data?.error || 'SMS sending failed')
    } finally {
      setSendingSMS(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentLecture
              ? `Current: ${currentLecture.subject_name} (Lecture ${currentLecture.lecture_number})`
              : 'No ongoing lecture'}
          </p>
        </div>
        <div className="flex gap-2">
          {currentLecture && !cameraActive && (
            <button onClick={startCamera} className="btn-primary flex items-center gap-2">
              <FiCamera /> Start Recognition
            </button>
          )}
          {cameraActive && (
            <button onClick={stopCamera} className="btn-danger flex items-center gap-2">
              <FiCamera /> Stop Camera
            </button>
          )}
          <button onClick={loadAbsentStudents} className="btn-secondary flex items-center gap-2">
            <FiUser /> Absent List
          </button>
          <button onClick={sendSMSAlerts} disabled={sendingSMS} className="btn-secondary flex items-center gap-2">
            <FiSend /> {sendingSMS ? 'Sending...' : 'Send SMS'}
          </button>
        </div>
      </div>

      {currentLecture && (
        <div className="glass-card p-4 flex items-center gap-3 text-sm">
          <FiClock className="text-primary-500" />
          <span className="font-medium">{currentLecture.subject_name}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">Lecture {currentLecture.lecture_number}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">{currentLecture.start_time} - {currentLecture.end_time}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">{currentLecture.class_division}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCamera className="text-purple-500" /> Camera Feed
          </h3>
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
            {cameraActive ? (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {scanning && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-green-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Scanning...
                  </div>
                )}
                {lastResult && (
                  <div className={`absolute bottom-3 left-3 right-3 p-3 rounded-xl text-sm ${
                    lastResult.success
                      ? 'bg-green-500/90 text-white'
                      : lastResult.mask
                      ? 'bg-yellow-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      {lastResult.success ? <FiCheckCircle /> : <FiAlertTriangle />}
                      <span>{lastResult.success ? `Recognized: ${lastResult.student?.name}` : lastResult.error}</span>
                    </div>
                    {lastResult.confidence && (
                      <p className="text-xs mt-1 opacity-80">Confidence: {lastResult.confidence}%</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500">
                <FiCamera className="text-4xl mx-auto mb-2" />
                <p className="text-sm">Camera is off</p>
                <p className="text-xs mt-1">Click "Start Recognition" to begin</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCheckCircle className="text-green-500" /> Today's Attendance
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Roll No</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">{r.roll_number}</td>
                    <td className="py-2 px-3 font-medium">{r.name}</td>
                    <td className="py-2 px-3">{r.subject_name}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'present'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {todayRecords.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">No records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {absentStudents.length > 0 && (
        <div ref={undefined}>
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiXCircle className="text-red-500" /> Absent Students
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {absentStudents.map((s) => (
                <div key={s.id} className="glass p-3 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 text-xs font-bold">
                    {s.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.roll_number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
