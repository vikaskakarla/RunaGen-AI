import React, { useState, useCallback } from 'react';
import {
  Zap, FileText, Target,
  CheckCircle, Copy,
  Sparkles, BarChart3, Award, RefreshCw,
  Upload, Trash2, Image, FileType
} from 'lucide-react';
import ResumeOptimizerSkeleton from './ResumeOptimizerSkeleton';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface OptimizationResult {
  optimized_resume: string;
  key_improvements: Array<{
    section: string;
    original: string;
    optimized: string;
    reason: string;
  }>;
  ats_score: number;
  keyword_optimization: {
    added_keywords: string[];
    keyword_density: string;
    missing_keywords: string[];
  };
  formatting_improvements: string[];
  achievement_enhancements: Array<{
    original: string;
    enhanced: string;
  }>;
}

interface ATSAnalysis {
  ats_score: number;
  score_breakdown?: {
    keyword_match: number;
    formatting: number;
    section_structure: number;
    readability: number;
  };
  breakdown?: Record<string, number>;
  keyword_analysis: {
    matched_keywords: string[];
    missing_keywords: string[];
    keyword_density: string;
    optimal_density: string;
  };
  formatting_issues: string[];
  improvement_suggestions: string[];
  pass_probability: number;
  semantic_analysis?: {
    similarity_score?: number;
    missing_semantic_concepts?: string[];
  };
  experience_analysis?: {
    role_relevance?: number;
    industry_alignment?: number;
    achievement_impact?: number;
    years_match?: boolean;
  };
  feedback?: string;
}

interface CoverLetterResult {
  cover_letter: string;
  key_highlights: string[];
  personalization_elements: string[];
  call_to_action: string;
}

interface ResumeOptimizerProps {
  resumeText?: string;
  targetRole?: string;
  onOptimizationComplete?: (result: OptimizationResult) => void;
}

const ResumeOptimizer: React.FC<ResumeOptimizerProps> = ({
  resumeText: initialResumeText,
  targetRole: initialTargetRole,
  onOptimizationComplete
}) => {
  const [resumeText, setResumeText] = useState(initialResumeText || '');
  const [targetRole, setTargetRole] = useState(initialTargetRole || 'software-engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');

  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [supportedFormats, setSupportedFormats] = useState<any>(null);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCalculatingATS, setIsCalculatingATS] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [atsAnalysis, setATSAnalysis] = useState<ATSAnalysis | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);

  const [activeTab, setActiveTab] = useState<'optimize' | 'ats' | 'cover'>('optimize');

  const roles = [
    { value: 'software-engineer', label: 'Software Engineer' },
    { value: 'data-analyst', label: 'Data Analyst' },
    { value: 'data-scientist', label: 'Data Scientist' },
    { value: 'machine-learning-engineer', label: 'Machine Learning Engineer' },
    { value: 'ai-engineer', label: 'AI Engineer' },
    { value: 'frontend-developer', label: 'Frontend Developer' },
    { value: 'backend-developer', label: 'Backend Developer' },
    { value: 'fullstack-developer', label: 'Full-Stack Developer' },
    { value: 'mobile-developer', label: 'Mobile Developer' },
    { value: 'devops-engineer', label: 'DevOps Engineer' },
    { value: 'cloud-engineer', label: 'Cloud Engineer' },
    { value: 'data-engineer', label: 'Data Engineer' },
    { value: 'qa-engineer', label: 'QA / Test Engineer' },
    { value: 'product-manager', label: 'Product Manager' },
    { value: 'ux-designer', label: 'UX Designer' },
    { value: 'cyber-security', label: 'Cyber Security' },
    { value: 'business-analyst', label: 'Business Analyst' },
    { value: 'marketing-analyst', label: 'Marketing Analyst' },
    { value: 'it-support', label: 'IT Support' },
  ];

  // Fetch supported formats on component mount
  React.useEffect(() => {
    const fetchSupportedFormats = async () => {
      try {
        console.log('Fetching supported formats from:', `${API_BASE}/optimizer/supported-formats`);
        const response = await fetch(`${API_BASE}/optimizer/supported-formats`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Supported formats response:', data);

        if (data.success) {
          setSupportedFormats(data);
        } else {
          console.error('API returned success: false');
        }
      } catch (error) {
        console.error('Failed to fetch supported formats:', error);
        // Set default supported formats as fallback
        setSupportedFormats({
          success: true,
          supported_extensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'],
          supported_mime_types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'text/plain'],
          max_file_size: '50MB',
          formats: {
            pdf: 'PDF documents (.pdf)',
            word: 'Word documents (.doc, .docx)',
            image: 'Images (.jpg, .jpeg, .png)',
            text: 'Text files (.txt)'
          }
        });
      }
    };
    fetchSupportedFormats();
  }, []);

  // File drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const validExtensions = supportedFormats?.supported_extensions || ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.rtf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert(`Unsupported file format: ${fileExtension}\n\nSupported formats: ${validExtensions.join(', ')}`);
      return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 50MB`);
      return;
    }

    console.log(`File selected: ${file.name} (${fileExtension}, ${(file.size / 1024).toFixed(2)} KB)`);
    setInputMode('file');
    setUploadedFile(file);
    setResumeText(''); // Clear text input when file is selected
  };

  const removeFile = () => {
    setUploadedFile(null);
    setOptimization(null);
    setATSAnalysis(null);
    setCoverLetter(null);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileType className="h-8 w-8 text-blue-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'tiff':
        return <Image className="h-8 w-8 text-green-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const optimizeResume = async () => {
    if (inputMode === 'file' && uploadedFile) {
      return optimizeResumeFromFile();
    }

    if (inputMode === 'text') {
      if (!resumeText.trim()) {
        alert('Please enter your resume text or upload a file');
        return;
      }
    } else if (inputMode === 'file') {
      if (!uploadedFile) {
        alert('Please upload a resume file');
        return;
      }
    }

    setIsOptimizing(true);
    try {
      const response = await fetch(`${API_BASE}/optimize-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          targetRole,
          jobDescriptions: jobDescription ? [jobDescription] : []
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOptimization(data);
        onOptimizationComplete?.(data);
      } else {
        alert('Optimization failed: ' + data.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Optimization failed:', error);
      alert('Optimization failed: ' + message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const optimizeResumeFromFile = async () => {
    if (!uploadedFile) {
      alert('Please upload a file');
      return;
    }

    setIsOptimizing(true);
    try {
      console.log(`Starting file optimization for: ${uploadedFile.name}`);

      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('targetRole', targetRole);
      if (jobDescription) formData.append('jobDescription', jobDescription);
      if (companyName) formData.append('companyName', companyName);

      console.log(`Sending request to: ${API_BASE}/optimize-resume-file`);

      const response = await fetch(`${API_BASE}/optimize-resume-file`, {
        method: 'POST',
        body: formData,
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('File optimization response:', data);

      if (data.success) {
        // Set the extracted text for display
        if (data.original_text) {
          setResumeText(data.original_text);
          console.log(`Extracted ${data.original_text.length} characters from file`);
        }

        // Set optimization results
        if (data.optimization) {
          setOptimization(data.optimization);
          onOptimizationComplete?.(data.optimization);
          console.log('Optimization results set');
        }

        // Set ATS analysis if available
        if (data.ats_analysis) {
          setATSAnalysis(data.ats_analysis);
          console.log('ATS analysis results set');
        }

        // Set cover letter if available
        if (data.cover_letter) {
          setCoverLetter(data.cover_letter);
          console.log('Cover letter generated');
        }

        alert(`File processed successfully!\n\nFile: ${data.file_info?.original_name}\nType: ${data.file_info?.file_type}\nText extracted: ${data.file_info?.text_length} characters`);

      } else {
        const errorMsg = data.error + (data.suggestion ? '\n\nSuggestion: ' + data.suggestion : '');
        console.error('File optimization failed:', errorMsg);
        alert('File optimization failed: ' + errorMsg);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('File optimization failed:', error);
      alert(`File optimization failed: ${message}\n\nPlease check:\n1. Server is running on port 3001\n2. File format is supported\n3. File is not corrupted`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const calculateATSScore = async () => {
    const currentResumeText = resumeText.trim();
    if (!jobDescription.trim()) {
      alert('Please provide a job description');
      return;
    }

    setIsCalculatingATS(true);
    try {
      if (inputMode === 'file' && uploadedFile) {
        // If a file is uploaded, use the file-based endpoint which also returns ats_analysis
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('targetRole', targetRole);
        formData.append('jobDescription', jobDescription);

        const response = await fetch(`${API_BASE}/optimize-resume-file`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
          if (data.original_text) {
            setResumeText(data.original_text);
          }
          if (data.ats_analysis) {
            setATSAnalysis(data.ats_analysis);
          } else {
            alert('ATS analysis not available from server response.');
          }
        } else {
          alert('ATS analysis failed: ' + (data.error || 'Unknown error'));
        }
      } else {
        // Text-input path uses the ATS-only endpoint
        if (!currentResumeText) {
          alert('Please enter your resume text or upload a file');
          return;
        }

        const response = await fetch(`${API_BASE}/calculate-ats-score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resumeText: currentResumeText,
            jobDescription
          }),
        });

        const data = await response.json();
        if (data.success) {
          setATSAnalysis(data);
        } else {
          alert('ATS analysis failed: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('ATS analysis failed:', error);
      alert('ATS analysis failed: ' + message);
    } finally {
      setIsCalculatingATS(false);
    }
  };

  const generateCoverLetter = async () => {
    const currentResumeText = resumeText.trim();
    if (!jobDescription.trim() || !companyName.trim()) {
      alert('Please provide job description and company name');
      return;
    }

    setIsGeneratingCoverLetter(true);
    try {
      if (inputMode === 'file' && uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('targetRole', targetRole);
        formData.append('jobDescription', jobDescription);
        formData.append('companyName', companyName);

        const response = await fetch(`${API_BASE}/optimize-resume-file`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
          if (data.original_text) {
            setResumeText(data.original_text);
          }
          if (data.cover_letter) {
            setCoverLetter(data.cover_letter);
          } else {
            alert('Cover letter not available from server response.');
          }
        } else {
          alert('Cover letter generation failed: ' + (data.error || 'Unknown error'));
        }
      } else {
        if (!currentResumeText) {
          alert('Please enter your resume text or upload a file');
          return;
        }

        const response = await fetch(`${API_BASE}/generate-cover-letter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resumeData: {
              skills: currentResumeText.match(/skills?[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/i)?.[1]?.split(/[\,\n]/).map(s => s.trim()) || [],
              experience: currentResumeText.match(/experience[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/i)?.[1] || '',
              education: currentResumeText.match(/education[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/i)?.[1] || ''
            },
            jobDescription,
            companyName
          }),
        });

        const data = await response.json();
        if (data.success) {
          setCoverLetter(data);
        } else {
          alert('Cover letter generation failed: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Cover letter generation failed:', error);
      alert('Cover letter generation failed: ' + message);
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border border-amber-200';
    return 'text-rose-600 bg-rose-50 border border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 font-outfit mb-4 flex items-center justify-center">
          <Sparkles className="h-8 w-8 mr-3 text-indigo-600" />
          AI Resume Optimizer
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          🎯 <strong>Hackathon Feature:</strong> AI-powered resume optimization, ATS scoring, and cover letter generation
        </p>
        <div className="mt-4">
          <button
            onClick={async () => {
              try {
                const response = await fetch(`${API_BASE}/optimizer/supported-formats`);
                const data = await response.json();
                alert(`API Test: ${data.success ? 'SUCCESS' : 'FAILED'}\nSupported formats: ${data.supported_extensions?.join(', ') || 'None'}`);
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                alert(`API Test FAILED: ${message}`);
              }
            }}
            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm"
          >
            Test API Connection
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center space-x-1 bg-white/50 p-1 rounded-xl border border-slate-200 backdrop-blur-sm shadow-sm">
        {[
          { id: 'optimize', label: 'Resume Optimizer', icon: Zap },
          { id: 'ats', label: 'ATS Score', icon: BarChart3 },
          { id: 'cover', label: 'Cover Letter', icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === id
              ? 'bg-white shadow text-indigo-600 border border-indigo-100'
              : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'
              }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Input Mode Selection */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
        <div className="flex justify-center space-x-1 bg-white/50 p-1 rounded-xl mb-6 border border-slate-200 w-fit mx-auto shadow-sm">
          <button
            onClick={() => setInputMode('text')}
            className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${inputMode === 'text'
              ? 'bg-white shadow text-indigo-600 border border-indigo-100'
              : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'
              }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Text Input
          </button>
          <button
            onClick={() => setInputMode('file')}
            className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${inputMode === 'file'
              ? 'bg-white shadow text-indigo-600 border border-indigo-100'
              : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'
              }`}
          >
            <Upload className="h-4 w-4 mr-2" />
            File Upload
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resume Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Resume Content
            </label>

            {inputMode === 'text' ? (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                className="w-full h-64 p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-none text-slate-800 placeholder-slate-400"
              />
            ) : (
              <div>
                {!uploadedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 h-64 flex flex-col justify-center ${dragActive
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/30'
                      }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-slate-800 mb-2">
                      Drop your resume here or click to browse
                    </h4>
                    <p className="text-slate-500 mb-4">
                      Supports: PDF, Word (.doc/.docx), Images (.jpg/.png), Text files
                    </p>
                    <p className="text-sm text-slate-400 mb-4">
                      Maximum file size: 50MB
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.txt,.rtf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-file-upload"
                    />
                    <label
                      htmlFor="resume-file-upload"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Choose File
                    </label>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white/60 h-64 flex flex-col justify-center backdrop-blur-sm shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(uploadedFile.name)}
                        <div>
                          <p className="font-semibold text-slate-800">{uploadedFile.name}</p>
                          <p className="text-sm text-slate-500">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {resumeText && (
                      <div className="bg-black/40 p-3 rounded-lg max-h-32 overflow-y-auto border border-white/10">
                        <p className="text-sm text-gray-300">
                          <strong>Extracted text preview:</strong>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {resumeText.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {supportedFormats && (
                  <div className="mt-2 text-xs text-slate-500">
                    <strong>Supported formats:</strong> {(supportedFormats?.formats ? Object.values(supportedFormats.formats) : []).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent text-slate-800"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value} className="bg-white text-slate-800">
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {(activeTab === 'ats' || activeTab === 'cover') && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="w-full h-32 p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-none text-slate-800 placeholder-slate-400"
                />
              </div>
            )}

            {activeTab === 'cover' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name..."
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent text-slate-800 placeholder-slate-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          {activeTab === 'optimize' && (
            <button
              onClick={optimizeResume}
              disabled={isOptimizing || (inputMode === 'text' && !resumeText.trim()) || (inputMode === 'file' && !uploadedFile)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 disabled:opacity-50"
            >
              {isOptimizing ? (
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Zap className="h-5 w-5 mr-2" />
              )}
              {isOptimizing ?
                (inputMode === 'file' ? 'Processing File...' : 'Optimizing...') :
                (inputMode === 'file' ? 'Process & Optimize File' : 'Optimize Resume')
              }
            </button>
          )}

          {activeTab === 'ats' && (
            <button
              onClick={calculateATSScore}
              disabled={isCalculatingATS}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 disabled:opacity-50"
            >
              {isCalculatingATS ? (
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-5 w-5 mr-2" />
              )}
              {isCalculatingATS ? 'Analyzing...' : 'Calculate ATS Score'}
            </button>
          )}

          {activeTab === 'cover' && (
            <button
              onClick={generateCoverLetter}
              disabled={isGeneratingCoverLetter}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 disabled:opacity-50"
            >
              {isGeneratingCoverLetter ? (
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 mr-2" />
              )}
              {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {activeTab === 'optimize' && isOptimizing && <ResumeOptimizerSkeleton activeTab="optimize" />}
      {activeTab === 'optimize' && optimization && !isOptimizing && (
        <div className="space-y-6">
          {/* ATS Score */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 font-outfit">ATS Compatibility Score</h3>
              <div className={`px-4 py-2 rounded-xl font-bold text-lg ${getScoreColor(optimization.ats_score)}`}>
                {optimization.ats_score}/100
              </div>
            </div>
          </div>

          {/* Optimized Resume */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 font-outfit">Optimized Resume</h3>
              <button
                onClick={() => copyToClipboard(optimization.optimized_resume)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </button>
            </div>
            <div className="bg-white/50 p-6 rounded-xl max-h-96 overflow-y-auto border border-slate-200 shadow-inner">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
                {optimization.optimized_resume}
              </pre>
            </div>
          </div>

          {/* Key Improvements */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-4">Key Improvements</h3>
            <div className="space-y-4">
              {(optimization.key_improvements ?? []).map((improvement, index) => (
                <div key={index} className="border border-slate-200 rounded-xl p-4 bg-white/60 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center mb-2">
                    <Target className="h-5 w-5 text-indigo-500 mr-2" />
                    <span className="font-semibold text-slate-800 font-outfit">{improvement.section}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Original:</p>
                      <p className="bg-rose-50 p-3 rounded-lg text-rose-700 border border-rose-100">{improvement.original}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Optimized:</p>
                      <p className="bg-emerald-50 p-3 rounded-lg text-emerald-700 border border-emerald-100">{improvement.optimized}</p>
                    </div>
                  </div>
                  <p className="text-indigo-600 text-sm mt-2 italic flex items-center">
                    <Sparkles className="h-3 w-3 mr-1 inline" /> {improvement.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATS Analysis Results */}
      {activeTab === 'ats' && isCalculatingATS && <ResumeOptimizerSkeleton activeTab="ats" />}
      {activeTab === 'ats' && atsAnalysis && !isCalculatingATS && (
        <div className="space-y-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-800 font-outfit">ATS Analysis Results</h3>
              <div className={`px-4 py-2 rounded-xl font-bold text-lg ${getScoreColor(atsAnalysis.ats_score ?? 0)}`}>
                {(atsAnalysis.ats_score ?? 0)}/100
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(atsAnalysis.breakdown ?? atsAnalysis.score_breakdown ?? {}).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-white/50 rounded-xl border border-slate-200">
                  <div className={`text-2xl font-bold mb-1 ${getScoreColor(Math.round((Number(value) || 0) * 100))}`}>
                    {Math.round((Number(value) || 0) * 100)}
                  </div>
                  <div className="text-sm text-slate-500 capitalize font-medium">
                    {key.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Pass Probability */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-xl mb-6 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-indigo-900 font-medium">ATS Pass Probability</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {(atsAnalysis.pass_probability ?? 0)}%
                </span>
              </div>
            </div>

            {/* Keyword Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-emerald-600 mb-3 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" /> Matched Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(atsAnalysis.keyword_analysis?.matched_keywords ?? []).map((keyword, index) => (
                    <span key={index} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm border border-emerald-100">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-rose-500 mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2" /> Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(atsAnalysis.keyword_analysis?.missing_keywords ?? []).map((keyword, index) => (
                    <span key={index} className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-sm border border-rose-100">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Semantic Analysis */}
            {atsAnalysis.semantic_analysis && (
              <div className="bg-indigo-50 p-4 rounded-xl mb-6 border border-indigo-100">
                <h4 className="font-semibold text-indigo-600 mb-3">Semantic Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-indigo-400 mb-1">Similarity Score</p>
                    <p className="text-lg font-bold text-indigo-700">
                      {Math.round((atsAnalysis.semantic_analysis.similarity_score || 0) * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-400 mb-1">Missing Concepts</p>
                    <div className="flex flex-wrap gap-1">
                      {(atsAnalysis.semantic_analysis.missing_semantic_concepts || []).map((concept, index) => (
                        <span key={index} className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs border border-amber-100">
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Experience Analysis */}
            {atsAnalysis.experience_analysis && (
              <div className="bg-violet-50 p-4 rounded-xl mb-6 border border-violet-100">
                <h4 className="font-semibold text-violet-600 mb-3">Experience Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-violet-400 mb-1">Role Relevance</p>
                    <p className="text-lg font-bold text-violet-700">
                      {Math.round((atsAnalysis.experience_analysis.role_relevance || 0) * 100)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-violet-400 mb-1">Industry Alignment</p>
                    <p className="text-lg font-bold text-violet-700">
                      {Math.round((atsAnalysis.experience_analysis.industry_alignment || 0) * 100)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-violet-400 mb-1">Achievement Impact</p>
                    <p className="text-lg font-bold text-violet-700">
                      {Math.round((atsAnalysis.experience_analysis.achievement_impact || 0) * 100)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-violet-400 mb-1">Years Match</p>
                    <p className="text-lg font-bold text-violet-700">
                      {atsAnalysis.experience_analysis.years_match ? '✓' : '✗'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback */}
            {atsAnalysis.feedback && (
              <div className="bg-amber-50 p-4 rounded-xl mb-6 border border-amber-100">
                <h4 className="font-semibold text-amber-600 mb-2">AI Feedback</h4>
                <p className="text-slate-700">{atsAnalysis.feedback}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cover Letter Results */}
      {activeTab === 'cover' && isGeneratingCoverLetter && <ResumeOptimizerSkeleton activeTab="cover" />}
      {activeTab === 'cover' && coverLetter && !isGeneratingCoverLetter && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-800 font-outfit">Generated Cover Letter</h3>
            <button
              onClick={() => copyToClipboard(coverLetter.cover_letter)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </button>
          </div>
          <div className="bg-white/50 p-6 rounded-xl mb-6 border border-slate-200 shadow-inner">
            <pre className="whitespace-pre-wrap text-slate-700 leading-relaxed font-mono text-sm">
              {coverLetter.cover_letter}
            </pre>
          </div>

          {/* Key Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/60 p-4 rounded-xl border border-slate-200 backdrop-blur-sm">
              <h4 className="font-semibold text-indigo-600 mb-3">Key Highlights</h4>
              <ul className="space-y-2">
                {(coverLetter.key_highlights ?? []).map((highlight, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/60 p-4 rounded-xl border border-slate-200 backdrop-blur-sm">
              <h4 className="font-semibold text-violet-600 mb-3">Personalization Elements</h4>
              <ul className="space-y-2">
                {(coverLetter.personalization_elements ?? []).map((element, index) => (
                  <li key={index} className="flex items-start">
                    <Award className="h-5 w-5 text-violet-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{element}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeOptimizer;