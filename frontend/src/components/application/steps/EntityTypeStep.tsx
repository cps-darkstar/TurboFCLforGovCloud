import { CheckCircle, FileText, UserCheck } from 'lucide-react';
import React from 'react';
import { ENTITY_REQUIREMENTS, ENTITY_TYPES, EntityType } from '../../../constants/businessRules';
import { useApplication } from '../../../contexts/ApplicationContext';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';

const EntityTypeStep: React.FC = () => {
  const { applicationData, updateApplicationData, setCurrentStep } = useApplication();
  const selectedEntityType = applicationData.entityType as EntityType;

  const handleSelectEntityType = (entityType: EntityType) => {
    updateApplicationData({ entityType });
  };

  const requirements = selectedEntityType ? ENTITY_REQUIREMENTS[selectedEntityType] : null;

  return (
    <div>
      <h2 className="text-2xl font-bold">Entity Structure</h2>
      <p className="text-gray-600 mb-6">Select your company's legal structure. This determines the required documents and personnel for your application.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(ENTITY_TYPES).map(([key, value]) => (
          <Card
            key={key}
            onClick={() => handleSelectEntityType(value as EntityType)}
            className={`cursor-pointer transition-all ${selectedEntityType === value ? 'border-blue-500 ring-2 ring-blue-500' : 'hover:border-gray-400'}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {key.replace(/_/g, ' ')}
                {selectedEntityType === value && <CheckCircle className="h-5 w-5 text-blue-600" />}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {requirements && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Requirements for {selectedEntityType.replace(/-/g, ' ')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium flex items-center gap-2"><FileText className="h-5 w-5" /> Required Documents</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-blue-800">
                {requirements.documents.map((doc, i) => <li key={i}>{doc}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-medium flex items-center gap-2"><UserCheck className="h-5 w-5" /> Key Personnel</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-blue-800">
                {requirements.kmps.map((kmp, i) => <li key={i}>{kmp}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          Back
        </Button>
        <Button onClick={() => setCurrentStep(3)} disabled={!selectedEntityType}>
          Next: FOCI Assessment
        </Button>
      </div>
    </div>
  );
};

export default EntityTypeStep; 