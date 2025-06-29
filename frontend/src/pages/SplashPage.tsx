import { CheckCircle, ShieldCheck, Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';

const proofPoints = [
  {
    text: "AI-powered document analysis and validation",
    icon: Zap
  },
  {
    text: "Guided step-by-step application process",
    icon: CheckCircle
  },
  {
    text: "Direct integration with SAM.gov for company data",
    icon: ShieldCheck
  },
  {
    text: "Secure environment built on AWS GovCloud",
    icon: ShieldCheck
  },
  {
    text: "Automated generation of SF-328 and other forms",
    icon: Zap
  },
];

const SplashPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-primary-bg flex flex-col justify-center items-center p-4">
      <header className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary-text">
          TurboFCL for GovCloud
        </h1>
        <p className="mt-4 text-lg text-secondary-text max-w-2xl mx-auto">
          The fastest, most reliable way to complete and submit your Facility Clearance (FCL) application package.
        </p>
      </header>

      <main className="mt-12 w-full max-w-4xl">
        <Card className="card-common">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Key Features</CardTitle>
          </CardHeader>
          <div className="p-6">
            <ul className="space-y-4">
              {proofPoints.map((point, index) => (
                <li key={index} className="flex items-start">
                  <point.icon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-primary-text">{point.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </main>

      <footer className="mt-12 text-center">
        <Link to="/login">
          <Button size="lg" variant="primary" className="btn-3d">
            Get Started / Login
          </Button>
        </Link>
        <p className="mt-4 text-sm text-gray-500">
          A secure solution for government contractors.
        </p>
      </footer>
    </div>
  );
};

export default SplashPage; 