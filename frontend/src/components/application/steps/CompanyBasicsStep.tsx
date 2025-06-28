import { Loader } from 'lucide-react';
import React from 'react';
import { useApplication } from '../../../contexts/ApplicationContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';

const CompanyBasicsStep: React.FC = () => {
  const { applicationData, updateApplicationData, setCurrentStep, processingStatus } = useApplication();

  return (
    <div>
      <h2 className="text-2xl font-bold">Company Basics</h2>
      <p className="text-gray-600 mb-6">Start by telling us about your company. Your UEI will be used to auto-populate information from SAM.gov.</p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="companyName">Company Legal Name</Label>
          <Input
            id="companyName"
            value={applicationData.companyName}
            onChange={(e) => updateApplicationData({ companyName: e.target.value })}
            placeholder="Your Company Inc."
          />
        </div>
        <div>
          <Label htmlFor="uei">Unique Entity ID (UEI)</Label>
          <div className="relative">
            <Input
              id="uei"
              value={applicationData.uei}
              onChange={(e) => updateApplicationData({ uei: e.target.value.toUpperCase() })}
              placeholder="e.g., ABC123DEF456"
              maxLength={12}
            />
            {processingStatus === 'fetching' && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader className="h-5 w-5 text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          {applicationData.samData && (
            <p className="text-sm text-green-600 mt-2">Successfully connected to SAM.gov.</p>
          )}
        </div>
        <div>
          <Label htmlFor="cageCode">CAGE Code (optional)</Label>
          <Input
            id="cageCode"
            value={applicationData.cageCode}
            onChange={(e) => updateApplicationData({ cageCode: e.target.value.toUpperCase() })}
            placeholder="e.g., 1A2B3"
            maxLength={10}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={() => setCurrentStep(2)}>
          Next: Entity Type
        </Button>
      </div>
    </div>
  );
};

export default CompanyBasicsStep; 