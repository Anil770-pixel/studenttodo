import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Todos from './pages/Todos';
import Competitions from './pages/Competitions';
import Calendar from './pages/Calendar';
import AiSchedule from './pages/AiSchedule';
import Analytics from './pages/Analytics';
import Tokens from './pages/Tokens';
import Signal from './pages/Signal';
import HackYourMonth from './pages/HackYourMonth';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import DebugAuth from './pages/DebugAuth';
import KnowledgeTracker from './pages/KnowledgeTracker';
import Assessments from './pages/Assessments';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="todos" element={<Todos />} />
            <Route path="competitions" element={<Competitions />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="ai-schedule" element={<AiSchedule />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="tokens" element={<Tokens />} />
            <Route path="signal" element={<Signal />} />
            <Route path="hack-your-month" element={<HackYourMonth />} />
            <Route path="profile" element={<Profile />} />
            <Route path="knowledge" element={<KnowledgeTracker />} />
            <Route path="debug" element={<DebugAuth />} />
          </Route>
        </Route>

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
