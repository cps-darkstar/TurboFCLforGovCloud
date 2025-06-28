/**
 * Enhanced Document Upload Component
 * Addresses 40% abandonment rate with improved UX
 */

import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    FileCheck,
    FileText,
    HelpCircle,
    Loader,
    Upload,
    X
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { ENTITY_REQUIREMENTS, EntityType } from '../../../constants/businessRules';
import { validateDocument } from '../../../hooks/useValidation';
import { Document as DocType } from '../../../types/turbofcl';

interface DocumentUploadStepProps {
  entityType: EntityType;
  uploadedDocuments: DocType[];
  onDocumentUpload: (file: File) => Promise<void>;
  onDocumentRemove: (documentId: string) => void;
}

interface DocumentRequirement {
  name: string;
  uploaded: boolean;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  file?: DocType;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  entityType,
  uploadedDocuments,
  onDocumentUpload,
  onDocumentRemove
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['required']));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get required documents for entity type
  const requiredDocuments = ENTITY_REQUIREMENTS[entityType]?.documents || [];
  
  // Calculate progress
  const uploadedDocNames = uploadedDocuments.map(doc => doc.name.toLowerCase());
  const completedCount = requiredDocuments.filter(docName => 
    uploadedDocNames.some(uploaded => uploaded.includes(docName.toLowerCase()))
  ).length;
  const completionPercentage = requiredDocuments.length > 0 ? Math.round((completedCount / requiredDocuments.length) * 100) : 0;

  // Categorize documents
  const documentCategories = {
    incorporation: ['Business License', 'Fictitious Name Certificate', 'Articles of Incorporation', 
                   'Certificate of Formation', 'Articles of Organization', 'Partnership Agreement'],
    governance: ['By-Laws', 'Operating Agreement', 'Stock Ledger', 'Legal Organization Chart'],
    meetings: ['Board/Company Meeting Minutes', 'LLC Meeting Minutes'],
    security: ['FSO/ITPSO Appointment Letter', 'KMP Citizenship Verification'],
    forms: ['Signed undated DD Form 441', 'Signed SF 328'],
    changes: ['Recent changes to company structure', 'Recent changes to company Structure'],
    sec: ['Most recent SEC filings']
  };

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const validation = validateDocument(file);
      
      if (!validation.isValid) {
        setErrors(prev => ({
          ...prev,
          [file.name]: validation.errors[0].message
        }));
        continue;
      }

      setUploadingFiles(prev => new Set(prev).add(file.name));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[file.name];
        return newErrors;
      });

      try {
        await onDocumentUpload(file);
      } catch (error) {
        setErrors(prev => ({
          ...prev,
          [file.name]: 'Upload failed. Please try again.'
        }));
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }
    }
  }, [onDocumentUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getDocumentStatus = (docName: string): DocumentRequirement => {
    const uploaded = uploadedDocuments.find(doc => 
      doc.name.toLowerCase().includes(docName.toLowerCase())
    );
    
    return {
      name: docName,
      uploaded: !!uploaded,
      status: uploaded ? 'completed' : 'pending',
      file: uploaded
    };
  };

  const categoryTitles: Record<string, string> = {
    incorporation: 'Incorporation Documents',
    governance: 'Governance Documents',
    meetings: 'Meeting Records',
    security: 'Security Documentation',
    forms: 'Government Forms',
    changes: 'Change Documentation',
    sec: 'SEC Filings'
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Document Upload Progress</h3>
            <p className="text-sm text-gray-600 mt-1">
              {completedCount} of {requiredDocuments.length} required documents uploaded
            </p>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-blue-600 hover:text-blue-700"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
            style={{ width: `${completionPercentage}%` }}
          >
            {completionPercentage > 10 && (
              <span className="text-xs text-white font-medium">{completionPercentage}%</span>
            )}
          </div>
        </div>

        {/* Time Estimate */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Estimated time remaining: {Math.max(5, 13 - Math.round(completionPercentage * 0.13))} minutes
          </span>
          {completionPercentage === 100 && (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              All documents uploaded!
            </span>
          )}
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Document Upload Tips</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Drag and drop multiple files at once to save time</li>
            <li>• Files must be PDF, DOC, or DOCX format</li>
            <li>• Maximum file size is 10MB per document</li>
            <li>• Ensure document names clearly indicate their content</li>
            <li>• You can upload similar documents (e.g., multiple meeting minutes) together</li>
          </ul>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drag and drop your documents here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse from your computer
        </p>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Select Files
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Accepted formats: PDF, DOC, DOCX • Max size: 10MB per file
        </p>
      </div>

      {/* Error Messages */}
      {Object.entries(errors).length > 0 && (
        <div className="space-y-2">
          {Object.entries(errors).map(([fileName, error]) => (
            <div key={fileName} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">{fileName}</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Requirements by Category */}
      <div className="space-y-4">
        {Object.entries(documentCategories).map(([category, docs]) => {
          const categoryDocs = requiredDocuments.filter(doc => 
            docs.some(d => doc.includes(d))
          );
          
          if (categoryDocs.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const categoryCompleted = categoryDocs.every(doc => 
            uploadedDocNames.some(uploaded => uploaded.includes(doc.toLowerCase()))
          );

          return (
            <div key={category} className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    categoryCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {categoryCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {categoryTitles[category] || category}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({categoryDocs.filter(doc => 
                      uploadedDocNames.some(uploaded => uploaded.includes(doc.toLowerCase()))
                    ).length}/{categoryDocs.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {categoryDocs.map(docName => {
                    const docStatus = getDocumentStatus(docName);
                    const isUploading = uploadingFiles.has(docName);

                    return (
                      <div
                        key={docName}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          docStatus.uploaded
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isUploading ? (
                            <Loader className="h-5 w-5 text-blue-600 animate-spin" />
                          ) : docStatus.uploaded ? (
                            <FileCheck className="h-5 w-5 text-green-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className={`text-sm font-medium ${
                              docStatus.uploaded ? 'text-green-900' : 'text-gray-700'
                            }`}>
                              {docName}
                            </p>
                            {docStatus.file && (
                              <p className="text-xs text-gray-500">
                                {docStatus.file.name} • {(docStatus.file.size / 1024 / 1024).toFixed(2)}MB
                              </p>
                            )}
                          </div>
                        </div>

                        {docStatus.file && !isUploading && (
                          <button
                            onClick={() => onDocumentRemove(docStatus.file!.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Remove document"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Uploaded but Uncategorized Documents */}
      {uploadedDocuments.some(doc => 
        !requiredDocuments.some(req => doc.name.toLowerCase().includes(req.toLowerCase()))
      ) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Additional Documents</h4>
          <div className="space-y-2">
            {uploadedDocuments
              .filter(doc => 
                !requiredDocuments.some(req => doc.name.toLowerCase().includes(req.toLowerCase()))
              )
              .map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {(doc.size / 1024 / 1024).toFixed(2)}MB • Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDocumentRemove(doc.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Remove document"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadStep;