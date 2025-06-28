import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ApplicationProvider } from './contexts/ApplicationContext';
import { Toaster } from 'react-hot-toast';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationPage from './pages/ApplicationPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Styles
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApplicationProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Navigate to="/dashboard" replace />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/application/:id?" element={
                  <ProtectedRoute>
                    <Layout>
                      <ApplicationPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              
              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </ApplicationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;