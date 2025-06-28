import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mockApplications = [
    {
      id: '1',
      companyName: user?.companyName || 'Test Company LLC',
      status: 'draft',
      createdAt: '2025-01-27',
      progress: 45
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-5 w-5 text-gray-500" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.companyName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{mockApplications.length}</p>
              <p className="text-gray-600">Applications</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-gray-600">In Review</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-gray-600">Approved</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">FCL Applications</h2>
            <button
              onClick={() => navigate('/application')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Application
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {mockApplications.map((app) => (
            <div key={app.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(app.status)}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{app.companyName}</h3>
                    <p className="text-sm text-gray-500">Created {app.createdAt}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{app.progress}% Complete</p>
                    <p className="text-sm text-gray-500 capitalize">{app.status}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/application/${app.id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Continue
                  </button>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${app.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {mockApplications.length === 0 && (
            <div className="px-6 py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first FCL application</p>
              <button
                onClick={() => navigate('/application')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Application
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;