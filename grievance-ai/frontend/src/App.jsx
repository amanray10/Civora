import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Protected from './components/Protected.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewComplaint from './pages/NewComplaint.jsx';
import ComplaintHistory from './pages/ComplaintHistory.jsx';
import ComplaintDetails from './pages/ComplaintDetails.jsx';
import Profile from './pages/Profile.jsx';
import Chatbot from './pages/Chatbot.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DepartmentDashboard from './pages/DepartmentDashboard.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/complaints/new" element={<Protected><NewComplaint /></Protected>} />
        <Route path="/complaints" element={<Protected><ComplaintHistory /></Protected>} />
        <Route path="/complaints/:id" element={<Protected><ComplaintDetails /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/chatbot" element={<Protected><Chatbot /></Protected>} />
        <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
        <Route path="/department" element={<Protected roles={['department', 'admin']}><DepartmentDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
