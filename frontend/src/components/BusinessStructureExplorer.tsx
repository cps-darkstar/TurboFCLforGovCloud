import {
    AlertTriangle,
    Briefcase,
    Building,
    CheckCircle,
    Crown,
    FileText,
    Globe,
    Shield,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BusinessStructure {
  uei: string;
  entityName: string;
  businessSize: string;
  entityType: string;
  structureComplexity: string;
  kmpCount: number;
  clearanceLevels: string[];
  specialAgreements: string[];
  ownershipTiers: number;
  foreignOwnership: number;
  complianceComplexity: string;
  focifactors: string[];
}

interface FOCIAssessment {
  uei: string;
  companyName: string;
  fociScore: number;
  riskLevel: string;
  riskFactors: string[];
  recommendedMitigation: string;
  specialAgreements: string[];
}

const BusinessStructureExplorer: React.FC = () => {
  const [businesses, setBusinesses] = useState<BusinessStructure[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessStructure | null>(null);
  const [fociAssessment, setFociAssessment] = useState<FOCIAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch business structures from our backend
  const fetchBusinessStructures = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/business-structures');
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      } else {
        console.error('Failed to fetch business structures');
      }
    } catch (error) {
      console.error('Error fetching business structures:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch FOCI assessment for selected business
  const fetchFociAssessment = async (uei: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/foci-assessment/${uei}`);
      if (response.ok) {
        const data = await response.json();
        setFociAssessment(data);
      }
    } catch (error) {
      console.error('Error fetching FOCI assessment:', error);
    }
  };

  useEffect(() => {
    fetchBusinessStructures();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchFociAssessment(selectedBusiness.uei);
    }
  }, [selectedBusiness]);

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'MEDIUM':
        return <Shield className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-green-600 bg-green-100';
    }
  };

  const businessSizeCategories = [
    'Large Business',
    'Small Business',
    'Small Disadvantaged Business',
    'Woman-Owned Small Business',
    'Veteran-Owned Small Business',
    'HUBZone Small Business',
    '8(a) Small Disadvantaged Business'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏢 Defense Contractor Entity Structure Explorer
        </h1>
        <p className="text-gray-600">
          Explore complex entity structures and FOCI assessments based on DCSA/NISS requirements
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading business structures...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Business Categories */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Business Size Categories</h2>
            <div className="space-y-3">
              {businessSizeCategories.map((category) => {
                const categoryBusinesses = businesses.filter(b => b.businessSize === category);
                return (
                  <div key={category} className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{category}</h3>
                    <div className="space-y-2">
                      {categoryBusinesses.map((business) => (
                        <button
                          key={business.uei}
                          onClick={() => setSelectedBusiness(business)}
                          className={`w-full text-left p-3 rounded-md transition-colors ${
                            selectedBusiness?.uei === business.uei
                              ? 'bg-blue-100 border-blue-300'
                              : 'bg-gray-50 hover:bg-gray-100'
                          } border`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{business.entityName}</div>
                              <div className="text-xs text-gray-500">UEI: {business.uei}</div>
                            </div>
                            {getComplexityIcon(business.complianceComplexity)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Business Details */}
          <div className="lg:col-span-2">
            {selectedBusiness ? (
              <div className="space-y-6">
                {/* Company Overview */}
                <div className="bg-white border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">{selectedBusiness.entityName}</h2>
                    <div className="flex items-center space-x-2">
                      {getComplexityIcon(selectedBusiness.complianceComplexity)}
                      <span className="text-sm font-medium">
                        {selectedBusiness.complianceComplexity} Complexity
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">UEI</label>
                      <div className="text-lg font-mono">{selectedBusiness.uei}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Business Size</label>
                      <div className="text-lg">{selectedBusiness.businessSize}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500">Entity Type</label>
                    <div className="text-base">{selectedBusiness.entityType}</div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500">Structure Complexity</label>
                    <div className="text-base">{selectedBusiness.structureComplexity}</div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                      <div className="text-lg font-semibold">{selectedBusiness.kmpCount}</div>
                      <div className="text-xs text-gray-500">KMP Required</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <Building className="h-6 w-6 mx-auto mb-1 text-green-600" />
                      <div className="text-lg font-semibold">{selectedBusiness.ownershipTiers}</div>
                      <div className="text-xs text-gray-500">Ownership Tiers</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <Globe className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                      <div className="text-lg font-semibold">{selectedBusiness.foreignOwnership}%</div>
                      <div className="text-xs text-gray-500">Foreign Ownership</div>
                    </div>
                  </div>

                  {/* Clearance Levels */}
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Clearance Levels</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedBusiness.clearanceLevels.map((level) => (
                        <span
                          key={level}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            level === 'TOP_SECRET'
                              ? 'bg-red-100 text-red-800'
                              : level === 'SECRET'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {level.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Special Agreements */}
                  {selectedBusiness.specialAgreements.length > 0 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Special Agreements</label>
                      <div className="space-y-1">
                        {selectedBusiness.specialAgreements.map((agreement, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <FileText className="h-4 w-4 mr-2 text-gray-400" />
                            {agreement}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FOCI Factors */}
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-500 mb-2 block">FOCI Factors</label>
                    <div className="space-y-1">
                      {selectedBusiness.focifactors.map((factor, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <Crown className="h-4 w-4 mr-2 text-gray-400" />
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FOCI Assessment */}
                {fociAssessment && (
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">FOCI Risk Assessment</h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-gray-500">Risk Level</div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(fociAssessment.riskLevel)}`}>
                          {fociAssessment.riskLevel}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">FOCI Score</div>
                        <div className="text-2xl font-bold">{fociAssessment.fociScore}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Recommended Mitigation</label>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <Briefcase className="h-5 w-5 inline mr-2 text-blue-600" />
                        {fociAssessment.recommendedMitigation}
                      </div>
                    </div>

                    {fociAssessment.riskFactors.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Risk Factors</label>
                        <div className="space-y-2">
                          {fociAssessment.riskFactors.map((factor, index) => (
                            <div key={index} className="flex items-center text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                              {factor}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Business</h3>
                <p className="text-gray-500">
                  Choose a defense contractor from the left panel to explore its entity structure and FOCI assessment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessStructureExplorer;
