import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ApplicationProvider } from './contexts/ApplicationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import BusinessStructureExplorer from './components/BusinessStructureExplorer';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ApplicationPage from './pages/ApplicationPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SplashPage from './pages/SplashPage';

// Styles
import './styles/global.css';

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

// A component to handle root navigation
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : <SplashPage />;
};

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
                <Route path="/" element={<RootNavigator />} />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/application" element={
                  <ProtectedRoute>
                    <Layout>
                      <ApplicationPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/business-explorer" element={
                  <ProtectedRoute>
                    <Layout>
                      <div className="container mx-auto px-4 py-8">
                        <div className="mb-8">
                          <h1 className="h1-typography">Business Structure Explorer</h1>
                          <p className="p-typography">
                            Explore defense contractor entity structures and FOCI assessments
                          </p>
                        </div>
                        <BusinessStructureExplorer />
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
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