import { Building, FileText, Home, LogOut, Shield, User } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/application', label: 'Application', icon: FileText },
    { path: '/business-explorer', label: 'Business Explorer', icon: Building },
  ];

  return (
    <div className="min-h-screen bg-primary-bg">
      <header className="bg-secondary-bg shadow-md border-b border-primary-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-accent-text" />
              <div>
                <h1 className="text-xl font-bold text-primary-text">TurboFCL</h1>
                <p className="text-xs text-secondary-text">AI-Powered FCL Assistant</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent-bg text-accent-text'
                        : 'text-secondary-text hover:text-primary-text hover:bg-primary-bg'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-primary-text">
                <User className="h-4 w-4" />
                <span>{user?.companyName}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-secondary-text hover:text-primary-text"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
};

export default Layout;