import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Building, 
  Globe, 
  Upload, 
  ChevronRight,
  ChevronLeft,
  Home,
  HelpCircle,
  Info,
  X,
  Plus,
  Trash2,
  Eye,
  Brain,
  Database,
  Zap,
  Download,
  Search,
  Bot,
  MessageSquare,
  FileCheck,
  AlertCircle
} from 'lucide-react';

const TurboFCL = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationData, setApplicationData] = useState({
    companyName: '',
    uei: '',
    cageCode: '',
    entityType: '',
    ownershipStructure: '',
    fociStatus: [],
    kmpStructure: [],
    hasInternationalOps: false,
    hasForeignFunding: false,
    kmps: [],
    documents: [],
    samData: null,
    edgarData: null,
    validationIssues: [],
    aiInsights: [],
    processingStatus: 'idle'
  });

  const [showHelp, setShowHelp] = useState(false);
  const [helpContent, setHelpContent] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Business structure requirements from DCSA logic
  const businessStructureRequirements = {
    'sole-proprietorship': {
      documents: ['Business License', 'Fictitious Name Certificate', 'Recent changes to company Structure'],
      kmps: ['Owner of sole proprietorship', 'Senior Management Official (SMO)', 'FSO', 'ITPSO']
    },
    'general-partnership': {
      documents: ['Business License', 'Fictitious Name Certificate', 'Partnership Agreement', 'Legal Organization Chart', 'Board/Company Meeting Minutes', 'Recent changes to company Structure', 'FSO/ITPSO Appointment Letter', 'KMP Citizenship Verification', 'Signed undated DD Form 441', 'Signed SF 328'],
      kmps: ['SMO', 'FSO', 'ITPSO', 'All General Partners']
    },
    'limited-partnership': {
      documents: ['Business License', 'Fictitious Name Certificate', 'Partnership Agreement', 'Certificate of Limited Partnership', 'Legal Organization Chart', 'Board/Company Meeting Minutes', 'Recent changes to company structure', 'FSO/ITPSO Appointment Letter', 'KMP Citizenship Verification', 'Signed undated DD Form 441', 'Signed SF 328'],
      kmps: ['SMO', 'FSO', 'ITPSO', 'All General Partners', 'Limited Partners (if working on classified contracts)']
    },
    'corporation': {
      documents: ['Business License', 'Fictitious Name Certificate', 'Articles of Incorporation', 'By-Laws', 'Stock Ledger', 'Legal Organization Chart', 'Board/Company Meeting Minutes', 'Recent changes to company structure', 'FSO/ITPSO Appointment Letter', 'KMP Citizenship Verification', 'Signed undated DD Form 441', 'Signed SF 328'],
      kmps: ['SMO', 'FSO', 'ITPSO', 'Chairman of the Board', 'Vice Chair of Board (if applicable)', 'Corporate Officials (if requiring classified access)']
    },
    'public-corporation': {
      documents: ['Business License', 'Fictitious Name Certificate', 'Articles of Incorporation', 'By-Laws', 'Stock Ledger', 'Most recent SEC filings', 'Legal Organization Chart', 'Board/Company Meeting Minutes', 'Recent changes to company Structure', 'FSO/ITPSO Appointment Letter', 'KMP Citizenship Verification', 'Signed undated DD Form 441', 'Signed SF 328'],
      kmps: ['SMO', 'FSO', 'ITPSO', 'Chairman of the Board', 'Vice Chair of Board (if applicable)', 'Corporate Officials (if requiring classified access)']
    },
    'llc': {
      documents: ['Business License', 'Fictitious Name Certificate', 'Certificate of Formation or Articles of Organization', 'Legal Organization Chart', 'Operating Agreement', 'LLC Meeting Minutes', 'Recent changes to company structure', 'FSO/ITPSO Appointment Letter', 'KMP Citizenship Verification', 'Signed undated DD Form 441', 'Signed SF 328'],
      kmps: ['SMO', 'FSO', 'ITPSO', 'LLC Members (if requiring classified access)', 'Managers']
    }
  };

  // Simulate API calls with realistic delays and responses
  const simulateAPICall = async (endpoint, delay = 1500) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (endpoint === 'sam.gov') {
      return {
        legalBusinessName: applicationData.companyName || "Quantum Dynamics LLC",
        uei: "ABC123DEF456",
        cageCode: "7X8Y9",
        entityStructure: "LIMITED LIABILITY COMPANY",
        stateOfIncorporation: "Delaware",
        principalPlaceOfBusiness: "1234 Defense Blvd, Reston, VA 20191",
        registrationStatus: "Active",
        lastUpdated: "2025-06-15"
      };
    } else if (endpoint === 'edgar') {
      return {
        cik: "0001234567",
        filings: [
          { formType: "10-K", filingDate: "2024-12-31", description: "Annual Report" },
          { formType: "8-K", filingDate: "2025-03-15", description: "Current Report" }
        ],
        ownershipInfo: {
          institutionalOwnership: "15%",
          foreignOwnership: "8%",
          insiderOwnership: "25%"
        }
      };
    }
    return null;
  };

  // Simulate LLM-powered validation
  const validateWithAI = async (data) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const issues = [];
    const insights = [];
    
    // Simulate validation logic
    if (data.samData && data.entityType) {
      const samEntity = data.samData.entityStructure.toLowerCase();
      const selectedEntity = data.entityType.toLowerCase();
      
      if (!samEntity.includes(selectedEntity.replace('-', ' '))) {
        issues.push({
          type: 'error',
          field: 'entityType',
          message: `Entity type mismatch: SAM.gov shows "${data.samData.entityStructure}" but you selected "${data.entityType}". Please verify.`,
          source: 'SAM.gov API'
        });
      }
    }

    if (data.fociStatus.includes('foreign-investors') && data.fociStatus.includes('no-foci')) {
      issues.push({
        type: 'error',
        field: 'fociStatus',
        message: 'Contradictory FOCI selections: Cannot have both foreign investors and no FOCI.',
        source: 'Logic Validation'
      });
    }

    // AI insights
    if (data.fociStatus.some(status => ['foreign-investors', 'foreign-ownership'].includes(status))) {
      insights.push({
        type: 'recommendation',
        message: 'Based on your FOCI status, you will likely need a Security Control Agreement (SCA) or Special Security Agreement (SSA). Consider preparing board resolutions and governance modifications.',
        confidence: 0.85
      });
    }

    if (data.entityType === 'llc' && data.kmps.length < 4) {
      insights.push({
        type: 'warning',
        message: 'LLCs typically require at least 4 KMPs: FSO, ITPSO, SMO, and Managing Member. Ensure all required positions are identified.',
        confidence: 0.92
      });
    }

    return { issues, insights };
  };

  const updateApplicationData = (field, value) => {
    setApplicationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showHelpModal = (content) => {
    setHelpContent(content);
    setShowHelp(true);
  };

  // Handle AI chat
  const handleAIChat = async (message) => {
    const newMessages = [...chatMessages, { type: 'user', content: message }];
    setChatMessages(newMessages);
    setChatInput('');

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const responses = [
      "Based on your entity structure, you'll need to provide your Operating Agreement and verify all members' citizenship status.",
      "For FOCI mitigation, I recommend preparing board resolutions that explicitly exclude foreign parties from classified decision-making.",
      "Your SAM.gov data shows some inconsistencies. Let me help you identify what needs to be updated.",
      "The DCSA typically requires 45-90 days for FCL processing. I can help ensure your package is complete to avoid delays."
    ];
    
    const aiResponse = responses[Math.floor(Math.random() * responses.length)];
    setChatMessages([...newMessages, { type: 'ai', content: aiResponse }]);
  };

  // Auto-fetch data when UEI is entered
  useEffect(() => {
    if (applicationData.uei && applicationData.uei.length >= 10) {
      const fetchData = async () => {
        setApplicationData(prev => ({ ...prev, processingStatus: 'fetching' }));
        
        try {
          const [samData, edgarData] = await Promise.all([
            simulateAPICall('sam.gov'),
            simulateAPICall('edgar')
          ]);
          
          setApplicationData(prev => ({
            ...prev,
            samData,
            edgarData,
            processingStatus: 'validating'
          }));

          // Run AI validation
          const validation = await validateWithAI({
            ...applicationData,
            samData,
            edgarData
          });

          setApplicationData(prev => ({
            ...prev,
            validationIssues: validation.issues,
            aiInsights: validation.insights,
            processingStatus: 'complete'
          }));

        } catch (error) {
          setApplicationData(prev => ({ 
            ...prev, 
            processingStatus: 'error',
            validationIssues: [{ type: 'error', message: 'Failed to fetch external data', source: 'API Error' }]
          }));
        }
      };

      fetchData();
    }
  }, [applicationData.uei]);

  const WelcomeStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">TurboFCL with AI Assistant</h1>
        <p className="text-lg text-gray-600 mb-6">
          AI-powered Facility Clearance application with real-time validation and expert guidance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <Brain className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">AI-Powered Validation</h3>
          <p className="text-sm text-blue-800">Real-time error checking and FOCI assessment using machine learning</p>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg">
          <Database className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">Automated Data Retrieval</h3>
          <p className="text-sm text-green-800">Automatic SAM.gov and EDGAR integration for seamless data population</p>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg">
          <FileCheck className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Smart Document Processing</h3>
          <p className="text-sm text-purple-800">OCR and NLP extraction of key information from uploaded documents</p>
        </div>
        
        <div className="bg-orange-50 p-6 rounded-lg">
          <MessageSquare className="h-8 w-8 text-orange-600 mb-3" />
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Expert AI Guidance</h3>
          <p className="text-sm text-orange-800">Chat with our DCSA-trained AI for personalized FCL guidance</p>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-left">
            <p className="text-sm font-medium text-yellow-900">Powered by AWS GovCloud</p>
            <p className="text-sm text-yellow-800">
              Secure, FedRAMP-compliant infrastructure with end-to-end encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const CompanyBasicsStep = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Legal Name
          </label>
          <input
            type="text"
            value={applicationData.companyName}
            onChange={(e) => updateApplicationData('companyName', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your company's legal name exactly as registered"
          />
          <p className="text-xs text-gray-500 mt-1">
            This must match your incorporation documents and SAM.gov registration
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unique Entity Identifier (UEI)
          </label>
          <div className="relative">
            <input
              type="text"
              value={applicationData.uei}
              onChange={(e) => updateApplicationData('uei', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="12-character UEI from SAM.gov"
              maxLength="12"
            />
            {applicationData.processingStatus === 'fetching' && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            We'll automatically retrieve your SAM.gov registration data
          </p>
        </div>

        {applicationData.samData && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">SAM.gov Data Retrieved</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Legal Name:</span>
                <p className="text-gray-900">{applicationData.samData.legalBusinessName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">CAGE Code:</span>
                <p className="text-gray-900">{applicationData.samData.cageCode}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Entity Structure:</span>
                <p className="text-gray-900">{applicationData.samData.entityStructure}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">State:</span>
                <p className="text-gray-900">{applicationData.samData.stateOfIncorporation}</p>
              </div>
            </div>
          </div>
        )}

        {applicationData.validationIssues.length > 0 && (
          <div className="space-y-3">
            {applicationData.validationIssues.map((issue, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                issue.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    issue.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      issue.type === 'error' ? 'text-red-900' : 'text-yellow-900'
                    }`}>Validation Issue</p>
                    <p className={`text-sm ${
                      issue.type === 'error' ? 'text-red-800' : 'text-yellow-800'
                    }`}>{issue.message}</p>
                    <p className="text-xs text-gray-600 mt-1">Source: {issue.source}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {applicationData.aiInsights.length > 0 && (
          <div className="space-y-3">
            {applicationData.aiInsights.map((insight, index) => (
              <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">AI Recommendation</p>
                    <p className="text-sm text-blue-800">{insight.message}</p>
                    <p className="text-xs text-blue-600 mt-1">Confidence: {Math.round(insight.confidence * 100)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const EntityTypeStep = () => {
    const getEntityHelp = (entityType) => {
      const requirements = businessStructureRequirements[entityType];
      if (!requirements) return '';
      
      return `For ${entityType.replace('-', ' ')}:\n\nRequired Documents:\n${requirements.documents.map(doc => `• ${doc}`).join('\n')}\n\nRequired KMPs:\n${requirements.kmps.map(kmp => `• ${kmp}`).join('\n')}`;
    };

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Entity Type</h2>
          <button 
            onClick={() => showHelpModal('Your business entity type determines which forms you need and what information DCSA requires. This should match your incorporation documents and SAM.gov registration.')}
            className="text-blue-600 hover:text-blue-800"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>

        {applicationData.samData && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-800">
              <strong>SAM.gov shows:</strong> {applicationData.samData.entityStructure}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Please select the matching entity type below
            </p>
          </div>
        )}

        <p className="text-gray-600 mb-6">Select your company's legal structure:</p>

        <div className="space-y-3">
          {[
            { value: 'llc', label: 'Limited Liability Company (LLC)', description: 'Most common for small defense contractors' },
            { value: 'corporation', label: 'Corporation (Privately Held)', description: 'Traditional corporate structure with shareholders' },
            { value: 'public-corporation', label: 'Corporation (Publicly Held)', description: 'Public company with SEC filings' },
            { value: 'general-partnership', label: 'General Partnership', description: 'Partnership with shared management' },
            { value: 'limited-partnership', label: 'Limited Partnership', description: 'Partnership with limited partners' },
            { value: 'sole-proprietorship', label: 'Sole Proprietorship', description: 'Single-owner business (rare for FCL)' }
          ].map((option) => (
            <div key={option.value} className="relative">
              <label className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="entityType"
                  value={option.value}
                  checked={applicationData.entityType === option.value}
                  onChange={(e) => updateApplicationData('entityType', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => showHelpModal(getEntityHelp(option.value))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Info className="h-4 w-4" />
                </button>
              </label>
            </div>
          ))}
        </div>

        {applicationData.entityType && businessStructureRequirements[applicationData.entityType] && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">
              Required for {applicationData.entityType.replace('-', ' ')}:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
              <div>
                <p className="font-medium mb-1">Key Documents:</p>
                <ul className="space-y-1">
                  {businessStructureRequirements[applicationData.entityType].documents.slice(0, 3).map((doc, index) => (
                    <li key={index}>• {doc}</li>
                  ))}
                  {businessStructureRequirements[applicationData.entityType].documents.length > 3 && (
                    <li>• +{businessStructureRequirements[applicationData.entityType].documents.length - 3} more...</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Required KMPs:</p>
                <ul className="space-y-1">
                  {businessStructureRequirements[applicationData.entityType].kmps.slice(0, 3).map((kmp, index) => (
                    <li key={index}>• {kmp}</li>
                  ))}
                  {businessStructureRequirements[applicationData.entityType].kmps.length > 3 && (
                    <li>• +{businessStructureRequirements[applicationData.entityType].kmps.length - 3} more...</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getSteps = () => {
    const baseSteps = [
      { id: 'welcome', title: 'Welcome', description: 'AI-powered FCL assistant' },
      { id: 'company-basics', title: 'Company Information', description: 'Basic details and API integration' },
      { id: 'entity-type', title: 'Entity Type', description: 'Business structure validation' },
      { id: 'ownership', title: 'Ownership Structure', description: 'Ownership analysis' },
      { id: 'foci-assessment', title: 'FOCI Assessment', description: 'AI-powered FOCI screening' },
      { id: 'document-upload', title: 'Document Processing', description: 'Smart document extraction' },
      { id: 'kmp-identification', title: 'Key Personnel', description: 'KMP validation' },
      { id: 'ai-review', title: 'AI Review', description: 'Comprehensive validation' },
      { id: 'submission-prep', title: 'Submission Package', description: 'Automated generation' }
    ];

    return baseSteps;
  };

  const steps = getSteps();

  const renderCurrentStep = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return <WelcomeStep />;
      case 'company-basics':
        return <CompanyBasicsStep />;
      case 'entity-type':
        return <EntityTypeStep />;
      default:
        return (
          <div className="max-w-2xl mx-auto text-center">
            <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h2>
            <p className="text-gray-600 mb-6">{step.description}</p>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-blue-800">
                This step will include AI-powered validation, document processing, and real-time guidance
                based on your entity type and DCSA requirements.
              </p>
            </div>
          </div>
        );
    }
  };

  // AI Chat Component
  const AIChat = () => (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">TurboFCL AI Assistant</span>
        </div>
        <button onClick={() => setShowAIChat(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 && (
          <div className="text-center text-gray-500 text-sm">
            <p>Ask me anything about FCL requirements, FOCI mitigation, or DCSA processes!</p>
          </div>
        )}
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg text-sm ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && chatInput.trim() && handleAIChat(chatInput)}
            placeholder="Ask about FCL requirements..."
            className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => chatInput.trim() && handleAIChat(chatInput)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">TurboFCL</h1>
                  <p className="text-xs text-gray-500">AI-Powered FCL Assistant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Database className="h-4 w-4" />
                <span>AWS GovCloud</span>
              </div>
              <button
                onClick={() => setShowAIChat(true)}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Bot className="h-4 w-4" />
                AI Help
              </button>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">CS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>{steps[currentStep].title}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px] p-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          
          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === steps.length - 1 ? 'Submit to DCSA' : 'Continue with AI Validation'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AI Chat */}
      {showAIChat && <AIChat />}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Help</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-gray-700 whitespace-pre-line">{helpContent}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurboFCL; 