/**
 * FOCI Assessment Component
 * Addresses 25% confusion rate with guided decision tree
 */

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Building,
  Users,
  DollarSign,
  Cpu,
  FileText,
  AlertTriangle,
  Info,
  HelpCircle,
  CheckCircle,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { 
  FOCI_CONDITIONS,
  FOCI_THRESHOLDS,
  MITIGATION_TYPES,
  PROCESSING_TIMES
} from '../constants/businessRules';
import { useFOCIAssessment } from '../hooks/useValidation';

interface FOCIAssessmentProps {
  onAssessmentComplete: (fociData: {
    hasFOCI: boolean;
    conditions: string[];
    mitigationRequired?: string;
    ownershipData: OwnershipData;
  }) => void;
}

interface OwnershipData {
  foreignOwnershipPercentage: number;
  foreignDebt: number;
  hasForeignBoardMembers: boolean;
  hasForeignTechnology: boolean;
  hasForeignContracts: boolean;
}

interface FOCIQuestion {
  id: string;
  question: string;
  helpText: string;
  inputType: 'boolean' | 'percentage' | 'currency';
  icon: React.ElementType;
  followUp?: string;
}

export const FOCIAssessment: React.FC<FOCIAssessmentProps> = ({ onAssessmentComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showHelp, setShowHelp] = useState<Record<string, boolean>>({});
  const [ownershipData, setOwnershipData] = useState<OwnershipData>({
    foreignOwnershipPercentage: 0,
    foreignDebt: 0,
    hasForeignBoardMembers: false,
    hasForeignTechnology: false,
    hasForeignContracts: false
  });

  const fociAssessment = useFOCIAssessment(ownershipData);

  const questions: FOCIQuestion[] = [
    {
      id: 'foreignOwnership',
      question: 'Does your company have any foreign ownership?',
      helpText: 'This includes direct or indirect ownership by foreign individuals, companies, or governments. Even small percentages (5% or more) must be reported.',
      inputType: 'boolean',
      icon: Globe,
      followUp: 'foreignOwnershipPercentage'
    },
    {
      id: 'foreignOwnershipPercentage',
      question: 'What percentage of foreign ownership does your company have?',
      helpText: 'Include all foreign ownership combined. Ownership above 5% triggers FOCI review. Above 10% requires more stringent mitigation.',
      inputType: 'percentage',
      icon: Building
    },
    {
      id: 'foreignBoardMembers',
      question: 'Are there any foreign nationals on your board of directors?',
      helpText: 'This includes dual citizens and permanent residents of other countries, even if they also hold US citizenship.',
      inputType: 'boolean',
      icon: Users
    },
    {
      id: 'foreignDebt',
      question: 'Does your company have any loans or debt from foreign sources?',
      helpText: 'Include all foreign debt, loans, or financial obligations. Debt exceeding $10 million triggers FOCI conditions.',
      inputType: 'currency',
      icon: DollarSign
    },
    {
      id: 'foreignTechnology',
      question: 'Does your company license technology from foreign entities?',
      helpText: 'This includes software licenses, patents, or any technology agreements with foreign companies or individuals.',
      inputType: 'boolean',
      icon: Cpu
    },
    {
      id: 'foreignContracts',
      question: 'Does your company have contracts with foreign governments?',
      helpText: 'Include any agreements, contracts, or business relationships with foreign government entities.',
      inputType: 'boolean',
      icon: FileText
    }
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    // Update ownership data based on answers
    setOwnershipData({
      foreignOwnershipPercentage: parseFloat(answers.foreignOwnershipPercentage || '0'),
      foreignDebt: parseFloat(answers.foreignDebt || '0'),
      hasForeignBoardMembers: answers.foreignBoardMembers === 'yes',
      hasForeignTechnology: answers.foreignTechnology === 'yes',
      hasForeignContracts: answers.foreignContracts === 'yes'
    });
  }, [answers]);

  const handleAnswer = (value: any) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    // Handle follow-up questions
    if (currentQuestion.followUp && value === 'yes') {
      const followUpIndex = questions.findIndex(q => q.id === currentQuestion.followUp);
      if (followUpIndex !== -1) {
        setCurrentQuestionIndex(followUpIndex);
        return;
      }
    }

    // Move to next question or complete
    if (isLastQuestion) {
      completeAssessment();
    } else {
      // Skip percentage question if no foreign ownership
      if (currentQuestion.id === 'foreignOwnership' && value === 'no') {
        setCurrentQuestionIndex(currentQuestionIndex + 2);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }
  };

  const completeAssessment = () => {
    onAssessmentComplete({
      hasFOCI: fociAssessment.hasFOCI,
      conditions: fociAssessment.conditions,
      mitigationRequired: fociAssessment.mitigationRequired,
      ownershipData
    });
  };

  const goBack = () => {
    if (currentQuestionIndex > 0) {
      // Handle skipping back over percentage question
      if (currentQuestion.id === 'foreignBoardMembers' && answers.foreignOwnership === 'no') {
        setCurrentQuestionIndex(0);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
    }
  };

  const toggleHelp = (questionId: string) => {
    setShowHelp(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const renderMitigationInfo = () => {
    if (!fociAssessment.mitigationRequired) return null;

    const mitigationDescriptions = {
      SSA: 'Special Security Agreement - Required for significant foreign ownership (>10%). Involves government-approved board members and strict security measures.',
      SCA: 'Security Control Agreement - For moderate foreign influence (5-10% ownership). Requires enhanced security measures and annual reporting.',
      VTA: 'Voting Trust Agreement - Used when foreign board members exist. US trustees manage voting rights.',
      LSA: 'Limited Security Agreement - For technology or contract-based FOCI. Implements firewalls between foreign and classified work.',
      PROXY: 'Proxy Agreement - For complete foreign ownership. US citizens act as proxy holders with full control.'
    };

    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Mitigation Required</h4>
            <p className="text-sm text-yellow-800 mt-1">
              {MITIGATION_TYPES[fociAssessment.mitigationRequired as keyof typeof MITIGATION_TYPES]}
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              {mitigationDescriptions[fociAssessment.mitigationRequired as keyof typeof mitigationDescriptions]}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderInput = () => {
    const QuestionIcon = currentQuestion.icon;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <QuestionIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {currentQuestion.question}
            </h3>
            <button
              onClick={() => toggleHelp(currentQuestion.id)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <HelpCircle className="h-4 w-4" />
              {showHelp[currentQuestion.id] ? 'Hide help' : 'Show help'}
            </button>
            
            {showHelp[currentQuestion.id] && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">{currentQuestion.helpText}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {currentQuestion.inputType === 'boolean' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAnswer('yes')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
              >
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Yes</span>
              </button>
              <button
                onClick={() => handleAnswer('no')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
              >
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">No</span>
              </button>
            </div>
          )}

          {currentQuestion.inputType === 'percentage' && (
            <div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      handleAnswer(e.currentTarget.value);
                    }
                  }}
                />
                <span className="text-gray-600 font-medium">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Press Enter or click Continue when ready
              </p>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                  if (input?.value) {
                    handleAnswer(input.value);
                  }
                }}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {currentQuestion.inputType === 'currency' && (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAnswer(e.currentTarget.value);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enter the total amount in USD. Press Enter or click Continue when ready.
              </p>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                  handleAnswer(input?.value || '0');
                }}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">FOCI Assessment</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Real-time FOCI Status */}
      {fociAssessment.hasFOCI && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">FOCI Conditions Detected</h4>
              <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                {fociAssessment.conditions.map(condition => (
                  <li key={condition}>• {condition.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                ))}
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                Estimated processing time: {fociAssessment.processingTimeImpact}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Question */}
      {renderInput()}

      {/* Mitigation Information */}
      {renderMitigationInfo()}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={goBack}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {isLastQuestion && (
          <button
            onClick={completeAssessment}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            Complete Assessment
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Educational Tips */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Why FOCI Matters</h4>
        <p className="text-sm text-gray-600">
          Foreign Ownership, Control, or Influence (FOCI) can affect your company's eligibility for a facility clearance. 
          The goal is not to eliminate foreign connections, but to properly disclose and mitigate them to protect national security.
        </p>
        {fociAssessment.hasFOCI && (
          <p className="text-sm text-gray-600 mt-2">
            Don't worry - having FOCI doesn't disqualify you. Many cleared companies successfully operate with FOCI mitigation measures in place.
          </p>
        )}
      </div>
    </div>
  );
}; 