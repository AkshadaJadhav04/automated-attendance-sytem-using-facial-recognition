# Smart Automated Attendance System Using Face Recognition

A full-stack web application for automated attendance tracking using facial recognition technology. Built with React.js, Flask, OpenCV, and MySQL.

## Features

- **Face Registration** - Register student faces via webcam (20-30 samples)
- **Real-time Face Recognition** - Mark attendance automatically in real-time
- **Timetable-based Attendance** - Attendance only during scheduled lecture timings
- **Mask Detection** - Detects masks and prompts removal before verification
- **SMS Notifications** - Twilio integration for absent student alerts
- **Admin Dashboard** - Glassmorphism UI with analytics and charts
- **Student Management** - Full CRUD operations
- **Attendance Reports** - Daily, monthly, subject-wise, and student-wise reports
- **Export** - CSV, Excel, and PDF report downloads
- **Dark/Light Mode** - Toggle between themes
- **Liveness Detection** - Basic photo detection to prevent fake attendance
- **JWT Authentication** - Secure admin login

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python Flask |
| Database | MySQL |
| Face Detection | OpenCV Haar Cascade / DNN |
| Face Recognition | face_recognition library |
| SMS | Twilio API |
| Authentication | JWT + bcrypt |
| Charts | Recharts |
| Reports | openpyxl, fpdf2 |

## Project Structure

```
attendance-system/
├── backend/
│   ├── app.py              # Flask main application
│   ├── config.py           # Configuration
│   ├── models.py           # Database models & queries
│   ├── requirements.txt    # Python dependencies
│   ├── routes/             # API route handlers
│   └── utils/              # Utility modules
│       ├── face_utils.py   # Face detection & recognition
│       ├── mask_detection.py
│       ├── sms_utils.py    # Twilio integration
│       └── report_utils.py # Report generation
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main app with routes
│   │   ├── api/            # API service layer
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth & Theme contexts
│   │   └── pages/          # Page components
│   └── package.json
├── database/
│   └── schema.sql          # MySQL schema
├── models/                 # ML models (Haar Cascade)
├── dataset/                # Face sample images
├── attendance/             # Attendance logs
├── reports/                # Generated reports
└── .env.example
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 18+
- MySQL 8.0+
- Webcam

### Backend Setup

1. **Create MySQL database:**
   ```sql
   CREATE DATABASE attendance_system;
   ```

2. **Navigate to backend:**
   ```bash
   cd backend
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   Copy `.env.example` to `.env` and update credentials:
   ```env
   MYSQL_PASSWORD=your_mysql_password
   TWILIO_ACCOUNT_SID=your_twilio_sid   # Optional
   TWILIO_AUTH_TOKEN=your_twilio_token  # Optional
   TWILIO_PHONE_NUMBER=+1234567890      # Optional
   ```

5. **Run the Flask server:**
   ```bash
   python app.py
   ```
   Server starts at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`

### Default Login

- **Username:** `admin`
- **Password:** `admin123`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/students` | List all students |
| POST | `/api/students` | Add student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| POST | `/api/students/capture-samples` | Capture face samples |
| GET | `/api/students/:id/attendance` | Student attendance history |
| GET | `/api/subjects` | List subjects |
| POST | `/api/subjects` | Add subject |
| GET | `/api/timetable` | Get timetable |
| POST | `/api/timetable` | Add timetable entry |
| GET | `/api/timetable/current-lecture` | Get current lecture |
| POST | `/api/attendance/mark` | Mark attendance via face |
| GET | `/api/attendance/today` | Today's attendance records |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/reports/daily` | Download daily report (CSV) |

## Face Recognition Details

- Uses OpenCV Haar Cascade for face detection
- Uses `face_recognition` library (dlib-based) for face encoding and matching
- Face encodings are stored as base64-encoded numpy arrays in MySQL
- Confidence score threshold: 50% minimum for recognition
- Liveness detection: analyzes texture and edge patterns

## Twilio SMS Setup

1. Create a Twilio account at https://twilio.com
2. Get Account SID, Auth Token, and a phone number
3. Add them to `.env`
4. The system will automatically send SMS to parents of absent students after each lecture

## License

MIT
