import React from 'react';
import { useApplicationData } from '../../hooks/useApplicationData';
import { Building2 } from 'lucide-react';

const options = [
  { id: 'llc', title: 'Limited Liability Company (LLC)', description: 'A flexible business structure combining aspects of corporations and partnerships.' },
  { id: 'corporation', title: 'Corporation (S-Corp, C-Corp)', description: 'A legal entity that is separate and distinct from its owners.' },
  { id: 'public-corporation', title: 'Publicly Traded Corporation', description: 'A corporation whose ownership is distributed via shares of stock traded on a public exchange.' },
  { id: 'partnership', title: 'Partnership', description: 'A business structure where two or more individuals manage and operate a business.' },
];

export const EntityTypeStep = () => {
  const { applicationData, updateApplicationData } = useApplicationData();

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Entity Structure</h2>
      <p className="mt-2 text-sm text-gray-600">
        Select the legal structure of your business. This determination is crucial for the Foreign Ownership, Control, or Influence (FOCI) assessment.
      </p>

      <fieldset className="mt-8">
        <legend className="sr-only">Entity Type</legend>
        <div className="space-y-4">
          {options.map((option) => (
            <label
              key={option.id}
              className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                applicationData.entityType === option.id
                  ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center h-5">
                <input
                  id={option.id}
                  name="entityType"
                  type="radio"
                  checked={applicationData.entityType === option.id}
                  onChange={() => updateApplicationData('entityType', option.id)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <p className="font-medium text-gray-900">{option.title}</p>
                <p className="text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
};