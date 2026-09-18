import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIProvider } from './context/AIContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GlobalAIAssistantModal from './components/GlobalAIAssistantModal';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import OnboardingPage from './pages/OnboardingPage';

import DashboardPage from './pages/DashboardPage';
import ProblemsPage from './pages/ProblemsPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import ProfilePage from './pages/ProfilePage';
import UserSearchPage from './pages/UserSearchPage';
import SocialListPage from './pages/SocialListPage';
import SubmissionDetailPage from './pages/SubmissionDetailPage';
import StudyRoomPage from './pages/StudyRoomPage';
import StudyRoomWorkspace from './pages/StudyRoomWorkspace';
import CompetitionPage from './pages/CompetitionPage';
import InterviewPage from './pages/InterviewPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import RoadmapPage from './pages/RoadmapPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SubmissionHistoryPage from './pages/SubmissionHistoryPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import ContestHistoryPage from './pages/ContestHistoryPage';
import AchievementsPage from './pages/AchievementsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

import CodingReportPage from './pages/CodingReportPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading CodeBuddy...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const hasCompletedOnboarding = user.onboardingCompleted || user.isOnboarded;

  // First-time users MUST complete onboarding assessment
  if (!hasCompletedOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding/experience" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <AIProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="flex flex-col min-h-screen bg-[#0B1020] text-gray-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/callback" element={<OAuthCallbackPage />} />
                <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />
                <Route path="/auth/github/callback" element={<OAuthCallbackPage />} />
                <Route path="/login" element={<AuthPage isRegister={false} />} />
                <Route path="/register" element={<AuthPage isRegister={true} />} />

                
                <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                <Route path="/onboarding/experience" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                <Route path="/onboarding/assessment" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/problems" element={<ProtectedRoute><ProblemsPage /></ProtectedRoute>} />
                <Route path="/problems/:slug" element={<ProtectedRoute><ProblemDetailPage /></ProtectedRoute>} />
                <Route path="/report/:sessionId" element={<ProtectedRoute><CodingReportPage /></ProtectedRoute>} />
                <Route path="/compiler" element={<ProtectedRoute><ProblemDetailPage /></ProtectedRoute>} />
                
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/profile/:username/followers" element={<ProtectedRoute><SocialListPage mode="followers" /></ProtectedRoute>} />
                <Route path="/profile/:username/following" element={<ProtectedRoute><SocialListPage mode="following" /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><UserSearchPage /></ProtectedRoute>} />

                <Route path="/study" element={<ProtectedRoute><StudyRoomPage /></ProtectedRoute>} />
                <Route path="/study/rooms/:roomId" element={<ProtectedRoute><StudyRoomWorkspace /></ProtectedRoute>} />
                <Route path="/study/room/:roomId" element={<ProtectedRoute><StudyRoomWorkspace /></ProtectedRoute>} />
                <Route path="/compete" element={<ProtectedRoute><CompetitionPage /></ProtectedRoute>} />
                <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
                <Route path="/company-dashboard" element={<ProtectedRoute><CompanyDashboardPage /></ProtectedRoute>} />
                <Route path="/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
                
                <Route path="/submissions" element={<ProtectedRoute><SubmissionHistoryPage /></ProtectedRoute>} />
                <Route path="/submissions/:submissionId" element={<ProtectedRoute><SubmissionDetailPage /></ProtectedRoute>} />
                <Route path="/interview-history" element={<ProtectedRoute><InterviewHistoryPage /></ProtectedRoute>} />
                <Route path="/contest-history" element={<ProtectedRoute><ContestHistoryPage /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <GlobalAIAssistantModal />
            <Footer />
          </div>
        </Router>
      </AIProvider>
    </AuthProvider>
  );
}
