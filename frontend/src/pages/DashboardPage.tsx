import { AlertTriangle, CheckCircle, Clock, FileText, Plus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
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
        return <FileText className="h-5 w-5 text-secondary-text" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-accent-text" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-secondary-text" />;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-secondary-text">Welcome back, {user?.companyName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-common">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-accent-text" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{mockApplications.length}</p>
              <p className="text-secondary-text">Applications</p>
            </div>
          </div>
        </div>
        
        <div className="card-common">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">0</p>
              <p className="text-secondary-text">In Review</p>
            </div>
          </div>
        </div>
        
        <div className="card-common">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">0</p>
              <p className="text-secondary-text">Approved</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-common">
        <div className="px-6 py-4 border-b border-primary-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">FCL Applications</h2>
            <button
              onClick={() => navigate('/application')}
              className="bg-button-primary-bg text-white px-4 py-2 rounded-md hover:bg-button-primary-hover flex items-center gap-2 btn-3d"
            >
              <Plus className="h-4 w-4" />
              New Application
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-primary-border">
          {mockApplications.map((app) => (
            <div key={app.id} className="px-6 py-4 hover:bg-accent-bg cursor-pointer" onClick={() => navigate('/application')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(app.status)}
                  <div>
                    <h3 className="text-sm font-medium">{app.companyName}</h3>
                    <p className="text-sm text-secondary-text">Created {app.createdAt}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="bg-accent-bg rounded-full h-2.5">
                      <div className="bg-accent-text h-2.5 rounded-full" style={{ width: `${app.progress}%` }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{app.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;