import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AssessmentList from "./pages/AssessmentList";
import AttemptPage from "./pages/AttemptPage";
import TrendsPage from "./pages/TrendsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ManageAssessments from "./pages/ManageAssessments";
import AssessmentAttempts from "./pages/AssessmentAttempts";
import AnalyticsPage from "./pages/AnalyticsPage";
import StudentsPage from "./pages/StudentsPage";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/assessments" element={<ProtectedRoute><AssessmentList /></ProtectedRoute>} />
            <Route path="/attempt/:attemptId" element={<ProtectedRoute><AttemptPage /></ProtectedRoute>} />
            <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/manage-assessments" element={<ProtectedRoute><ManageAssessments /></ProtectedRoute>} />
            <Route path="/assessment-attempts/:assessmentId" element={<ProtectedRoute><AssessmentAttempts /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
