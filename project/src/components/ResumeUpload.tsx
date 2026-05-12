import React, { useState, useCallback } from 'react';
import {
  Upload, FileText, Loader2,
  Trash2, RefreshCw, Target, TrendingUp,
  Award, Lightbulb, ArrowRight, Star, Zap, Youtube
} from 'lucide-react';
import FullAnalysisModal from './FullAnalysisModal';
import YouTubeVideoCard from './YouTubeVideoCard';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface SkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

interface JobMatch {
  title: string;
  company: string;
  matchPercentage: number;
  missingSkills: string[];
  strongPoints: string[];
  location?: string;
  description?: string;
  salary?: string;
  url?: string;
}

interface ResumeAnalysis {
  analysisId?: string;
  skillsFound: string[];
  skillsGap: SkillGap[];
  jobMatches: JobMatch[];
  overallScore: number;
  recommendations: string[];
  experienceLevel: string;
  careerTracks: string[];
}

interface ResumeUploadProps {
  userId?: string;
  onAnalysisComplete?: (analysis: ResumeAnalysis) => void;
  onRoadmapGenerated?: (roadmap: any) => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ userId, onAnalysisComplete, onRoadmapGenerated }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedJobRole, setSelectedJobRole] = useState('auto-detect');
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [showFullModal, setShowFullModal] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [activeJDTab, setActiveJDTab] = useState<'paste' | 'company'>('paste'); // Track which tab is active

  // Mock job descriptions for different roles
  const jobDescriptions = {
    'auto-detect': {
      title: 'Auto-Detect Role',
      skills: ['Automatic role detection based on resume content'],
      description: 'Let AI determine the best role match for your resume'
    },
    'data-analyst': {
      title: 'Data Analyst',
      skills: ['SQL', 'Python', 'Tableau', 'Excel', 'Statistics', 'Power BI', 'R'],
      description: 'Analyze complex datasets to drive business decisions'
    },
    'software-engineer': {
      title: 'Software Engineer',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Git', 'AWS', 'Docker'],
      description: 'Build scalable web applications and systems'
    },
    'frontend-developer': {
      title: 'Frontend Developer',
      skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Accessibility'],
      description: 'Build modern, accessible user interfaces'
    },
    'backend-developer': {
      title: 'Backend Developer',
      skills: ['Node.js', 'Express', 'Databases', 'APIs', 'Authentication', 'Caching'],
      description: 'Design and build server-side logic and APIs'
    },
    'fullstack-developer': {
      title: 'Full-Stack Developer',
      skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Docker', 'CI/CD'],
      description: 'Deliver end-to-end features across frontend and backend'
    },
    'mobile-developer': {
      title: 'Mobile Developer',
      skills: ['React Native', 'Swift/Kotlin', 'REST', 'Offline Storage', 'Testing'],
      description: 'Create native and cross-platform mobile apps'
    },
    'data-scientist': {
      title: 'Data Scientist',
      skills: ['Python', 'Pandas', 'Machine Learning', 'Statistics', 'NLP', 'Deep Learning'],
      description: 'Build predictive models and derive insights from data'
    },
    'machine-learning-engineer': {
      title: 'Machine Learning Engineer',
      skills: ['ML Pipelines', 'MLOps', 'TensorFlow/PyTorch', 'Feature Engineering', 'Cloud ML'],
      description: 'Productionize and scale machine learning systems'
    },
    'ai-engineer': {
      title: 'AI Engineer',
      skills: ['LLMs', 'Prompt Engineering', 'Vector DBs', 'RAG', 'Python', 'APIs'],
      description: 'Build AI-powered applications and agents'
    },
    'data-engineer': {
      title: 'Data Engineer',
      skills: ['Airflow', 'ETL', 'Spark', 'SQL', 'Data Warehousing', 'Cloud Data'],
      description: 'Develop and maintain data pipelines and platforms'
    },
    'devops-engineer': {
      title: 'DevOps Engineer',
      skills: ['CI/CD', 'Kubernetes', 'Terraform', 'Observability', 'Linux', 'SRE'],
      description: 'Automate deployments and ensure reliable operations'
    },
    'cloud-engineer': {
      title: 'Cloud Engineer',
      skills: ['AWS/Azure/GCP', 'Networking', 'Security', 'Serverless', 'IaC'],
      description: 'Design and build scalable cloud infrastructure'
    },
    'qa-engineer': {
      title: 'QA / Test Engineer',
      skills: ['Test Automation', 'Playwright/Cypress', 'API Testing', 'Performance'],
      description: 'Ensure product quality through automated and manual testing'
    },
    'product-manager': {
      title: 'Product Manager',
      skills: ['Product Strategy', 'Analytics', 'User Research', 'Agile', 'SQL', 'Figma'],
      description: 'Drive product vision and strategy from conception to launch'
    },
    'ux-designer': {
      title: 'UX Designer',
      skills: ['Figma', 'User Research', 'Prototyping', 'Wireframing', 'Adobe Creative Suite', 'Usability Testing'],
      description: 'Design intuitive user experiences and interfaces'
    },
    'business-analyst': {
      title: 'Business Analyst',
      skills: ['Requirements', 'Stakeholders', 'Dashboards', 'SQL', 'Documentation'],
      description: 'Bridge business goals with technical solutions'
    },
    'marketing-analyst': {
      title: 'Marketing Analyst',
      skills: ['SQL', 'Google Analytics', 'A/B Testing', 'Attribution', 'Excel'],
      description: 'Analyze campaigns and customer data to drive growth'
    },
    'it-support': {
      title: 'IT Support Specialist',
      skills: ['Troubleshooting', 'Windows/Mac', 'Networking Basics', 'Ticketing', 'Scripting'],
      description: 'Support end-users and maintain IT systems'
    },
    'cyber-security': {
      title: 'Cyber Security',
      skills: ['Network Security', 'SIEM', 'Incident Response', 'Penetration Testing', 'Threat Modeling', 'Python', 'Linux', 'Cloud Security', 'NIST', 'ISO 27001'],
      description: 'Protect systems and data by preventing, detecting, and responding to threats'
    }
  };

  // Offline YouTube fallback: build watch/search links without API
  const buildYouTubeFallbackVideos = (topic: string, limit: number = 2) => {
    const queries = [
      `${topic} for beginners`,
      `${topic} tutorial`,
      `${topic} crash course`,
      `${topic} roadmap`
    ].slice(0, limit);
    return queries.map((q) => ({
      title: q.replace(/\b\w/g, (m) => m.toUpperCase()),
      topic,
      search_query: q,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
    }));
  };

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
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setUploadedFile(file);
      } else {
        alert('Please upload a PDF file only.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setUploadedFile(file);
      } else {
        alert('Please upload a PDF file only.');
      }
    }
  };


  const analyzeResume = async () => {
    if (!uploadedFile) return;

    // Validate that user provided either JD text or company name + role
    if (!jobDescription.trim() && !companyName.trim()) {
      alert('Please provide either a job description or company name + role before analyzing.');
      return;
    }

    // If company name is provided, role must also be selected
    if (companyName.trim() && (!selectedJobRole || selectedJobRole === 'auto-detect')) {
      alert('Please select a specific role when providing a company name.');
      return;
    }

    setIsAnalyzing(true);
    setUploadProgress(0);

    try {
      const form = new FormData();
      form.append('file', uploadedFile);

      form.append('target_role', selectedJobRole);

      // Always send job description or company name (REQUIRED)
      if (jobDescription.trim()) {
        form.append('jobDescription', jobDescription.trim());
        console.log('Sending jobDescription:', jobDescription.substring(0, 100) + '...');
      } else if (companyName.trim()) {
        form.append('companyName', companyName.trim());
        console.log('Sending companyName:', companyName);
      }

      console.log('Sending target_role:', selectedJobRole);

      const url = `${API_BASE}/upload_resume`;

      const data: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        // Use actual user ID from props or localStorage instead of hardcoded 'demo-user'
        const actualUserId = userId || localStorage.getItem('userId') || localStorage.getItem('temp_user_id') || 'anonymous';
        xhr.setRequestHeader('x-user-id', actualUserId);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          console.log('Server response status:', xhr.status);
          console.log('Server response text:', xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Parsed response:', response);
              resolve(response);
            } catch (e) {
              console.error('JSON parse error:', e);
              resolve({});
            }
          } else {
            console.error('Server error:', xhr.status, xhr.responseText);
            // If server is not available, fall back to mock analysis
            if (xhr.status === 0 || xhr.status >= 500) {
              console.log('Server not available, using mock analysis');
              resolve({
                match_score: 85,
                skills_present: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'Git', 'AWS', 'Docker'],
                skills_missing: ['Kubernetes', 'CI/CD', 'Machine Learning'],
                recommendations: ['Learn Kubernetes for container orchestration', 'Master CI/CD practices', 'Explore machine learning basics'],
                detected_role: 'software-engineer'
              });
            } else {
              reject(new Error(xhr.responseText || 'Upload failed'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(form);
      });

      // Debug: Log the received data
      console.log('Received analysis data:', data);
      console.log('Job matches from server:', data.job_matches);

      // Update selected role if auto-detection was used
      if (data.detected_role && data.detected_role !== 'auto-detect') {
        setSelectedJobRole(data.detected_role);
      }

      // Map backend payload to existing UI shape for MVP
      const analysisResult: ResumeAnalysis = {
        analysisId: data.id || null,
        skillsFound: data.skills_present || [],
        skillsGap: (data.skills_missing || []).slice(0, 5).map((s: string, index: number) => {
          const current = Math.floor(Math.random() * 40) + 10; // Random current level 10-50
          const required = Math.floor(Math.random() * 30) + 70; // Random required level 70-100
          return {
            skill: s,
            currentLevel: current,
            targetLevel: required,
            gap: Math.max(0, required - current),
            priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low'
          };
        }),
        jobMatches: (() => {
          const jobMatches = data.job_matches || [];
          console.log('Processing job matches:', jobMatches);
          const mapped = jobMatches.map((job: any) => ({
            title: job.title,
            company: job.company,
            matchPercentage: job.matchPercentage,
            missingSkills: job.missingSkills || [],
            strongPoints: job.strongPoints || [],
            location: job.location,
            description: job.description,
            salary: job.salary,
            url: job.url
          }));
          console.log('Mapped job matches:', mapped);
          return mapped;
        })(),
        overallScore: data.match_score ?? 0,
        recommendations: data.recommendations || [],
        experienceLevel: '—',
        careerTracks: []
      };

      console.log('Mapped analysis result:', analysisResult);
      console.log('Final job matches count:', analysisResult.jobMatches.length);

      setAnalysis(analysisResult);
      setAnalysisId(data.id || null);

      // Save skills profile to user account
      await saveSkillsProfile(analysisResult, data.id);

      onAnalysisComplete?.(analysisResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again. (' + message + ')');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  // Save Skills Profile to User Account
  const saveSkillsProfile = async (analysisData: ResumeAnalysis, analysisId: string | null) => {
    try {
      const actualUserId = userId || localStorage.getItem('userId') || localStorage.getItem('temp_user_id');

      if (!actualUserId || actualUserId === 'anonymous') {
        console.log('⚠️ Skipping skills profile save - no valid user ID');
        return;
      }

      console.log('💾 Saving skills profile to user account...');

      const response = await fetch(`${API_BASE}/api/user/skills-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': actualUserId,
        },
        body: JSON.stringify({
          skills: analysisData.skillsFound || [],
          skillGaps: analysisData.skillsGap || [],
          targetCompany: companyName || '',
          targetRole: selectedJobRole && selectedJobRole !== 'auto-detect' ? selectedJobRole : '',
          analysisId: analysisId || ''
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Skills profile saved successfully!');
        console.log(`   Company: ${companyName}, Role: ${selectedJobRole}`);
        console.log(`   Skills: ${analysisData.skillsFound?.length || 0}, Gaps: ${analysisData.skillsGap?.length || 0}`);
      } else {
        console.error('❌ Failed to save skills profile:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving skills profile:', error);
      // Don't show error to user - this is a background operation
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setAnalysis(null);
    setUploadProgress(0);
    setRoadmap(null);
    setSimulation(null);
  };

  // Generate Learning Roadmap
  const generateLearningRoadmap = async () => {
    if (!analysis || !analysisId) {
      alert('Please analyze your resume first');
      return;
    }

    setIsGeneratingRoadmap(true);
    try {
      // Get actual user ID
      const actualUserId = userId || localStorage.getItem('userId') || localStorage.getItem('temp_user_id') || 'anonymous';

      const response = await fetch(`${API_BASE}/generate-learning-roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': actualUserId,  // Include user ID for proper tracking
        },
        body: JSON.stringify({
          analysisId: analysisId,
          role: analysis.experienceLevel || 'software-engineer',
          skillsPresent: analysis.skillsFound,
          skillsMissing: analysis.skillsGap.map(s => s.skill),
          recommendations: analysis.recommendations
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRoadmap(data.roadmap);
        if (onRoadmapGenerated) {
          onRoadmapGenerated(data.roadmap);
        }
        alert('Learning roadmap generated successfully! Check the roadmap section below and in the Dashboard.');
      } else {
        alert('Failed to generate roadmap: ' + data.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Roadmap generation failed:', error);
      alert('Failed to generate roadmap: ' + message);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Start Career Simulation
  const startCareerSimulation = async () => {
    if (!analysis || !analysisId) {
      alert('Please analyze your resume first');
      return;
    }

    setIsStartingSimulation(true);
    try {
      // Get actual user ID
      const actualUserId = userId || localStorage.getItem('userId') || localStorage.getItem('temp_user_id') || 'anonymous';

      const response = await fetch(`${API_BASE}/start-career-simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': actualUserId,  // Include user ID for proper tracking
        },
        body: JSON.stringify({
          userId: actualUserId,
          analysisId: analysisId,
          role: analysis.experienceLevel || 'software-engineer',
          skillsPresent: analysis.skillsFound,
          skillsMissing: analysis.skillsGap.map(s => s.skill),
          jobMatches: analysis.jobMatches
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSimulation(data.simulation);
        alert('Career simulation started successfully! Check the simulation section below.');
      } else {
        alert('Failed to start simulation: ' + data.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Simulation start failed:', error);
      alert('Failed to start simulation: ' + message);
    } finally {
      setIsStartingSimulation(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-600 bg-rose-50 border border-rose-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border border-emerald-200';
      default: return 'text-slate-400 bg-slate-50 border border-slate-200';
    }
  };

  // Generate fallback recommendations when backend doesn't provide any
  const generateFallbackRecommendations = (a: ResumeAnalysis): string[] => {
    if (!a) return [];
    const topGaps = (a.skillsGap || []).slice(0, 3).map(g => g.skill);
    const topJob = (a.jobMatches || [])[0];
    const recs: string[] = [];
    if (topGaps.length > 0) {
      recs.push(`Focus on closing gaps in ${topGaps.join(', ')} over the next 4-8 weeks.`);
      recs.push(`Take one hands-on project for each gap skill to build portfolio proof.`);
    }
    if (topJob) {
      recs.push(`Target roles like "${topJob.title}" at companies similar to ${topJob.company}.`);
    }
    if (a.skillsFound && a.skillsFound.length > 0) {
      recs.push(`Highlight strengths: ${a.skillsFound.slice(0, 3).join(', ')} in the top third of your resume.`);
    }
    return recs.length > 0 ? recs : ['Re-run analysis after uploading a recent resume to receive tailored tips.'];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 font-outfit mb-4">Resume Analysis & Job Matching</h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Upload your resume and get AI-powered insights on skill gaps, job matches, and personalized recommendations
        </p>
      </div>

      {/* Job Role Selection */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
        <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-4">Select Target Role</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(jobDescriptions).map(([key, job]) => (
            <button
              key={key}
              onClick={() => setSelectedJobRole(key)}
              className={`p-4 rounded-xl border transition-all duration-300 text-left ${selectedJobRole === key
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-500/20'
                : 'border-slate-200 hover:border-indigo-300 bg-white/50 hover:bg-white text-slate-500 hover:text-indigo-600 hover:shadow-sm'
                }`}
            >
              <h4 className="font-semibold mb-2 font-outfit">{job.title}</h4>
              <p className="text-sm opacity-80 mb-3">{job.description}</p>
              <div className="flex flex-wrap gap-1">
                {job.skills.slice(0, 3).map((skill) => (
                  <span key={skill} className="text-xs bg-white text-slate-600 px-2 py-1 rounded border border-slate-200">
                    {skill}
                  </span>
                ))}
                {job.skills.length > 3 && (
                  <span className="text-xs text-slate-400">+{job.skills.length - 3} more</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Job Description Input (REQUIRED) */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-800 font-outfit">Job Description <span className="text-red-500">*</span></h3>
          <p className="text-sm text-slate-600 mt-2">
            Provide a real job description for accurate, company-specific skill gap analysis
          </p>
        </div>

        <div className="space-y-4">


          {/* Tab Selection */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => {
                setActiveJDTab('paste');
                setCompanyName(''); // Clear company when switching to paste
              }}
              className={`px-4 py-2 font-medium transition-all ${activeJDTab === 'paste' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Paste JD Text
            </button>
            <button
              onClick={() => {
                setActiveJDTab('company');
                setJobDescription(''); // Clear JD text when switching to company
              }}
              className={`px-4 py-2 font-medium transition-all ${activeJDTab === 'company' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Enter Company + Role
            </button>
          </div>

          {activeJDTab === 'paste' ? (
            /* Paste JD Text */
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Job Description Text
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here...&#10;&#10;Example:&#10;Google is seeking a Software Engineer to join our Cloud team.&#10;Requirements:&#10;- 5+ years experience with distributed systems&#10;- Proficiency in Go, Java, or C++&#10;- Experience with Kubernetes and GCP&#10;..."
                className="w-full h-48 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                AI will extract the company name and role automatically
              </p>
            </div>
          ) : (
            /* Enter Company + Role */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Google, Microsoft, Amazon"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Role *
                </label>
                <input
                  type="text"
                  value={selectedJobRole === 'auto-detect' ? '' : selectedJobRole}
                  onChange={(e) => setSelectedJobRole(e.target.value || 'auto-detect')}
                  placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter the specific role you're targeting (required when providing company name)
                </p>
              </div>
              <p className="text-xs text-slate-500">
                AI will generate a realistic job description for <strong>{companyName || 'the company'}</strong> {selectedJobRole && selectedJobRole !== 'auto-detect' ? `as a ${selectedJobRole}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
        <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6">Upload Your Resume</h3>

        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${dragActive
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-indigo-200 bg-indigo-50/30 text-slate-500 hover:bg-indigo-50/50 hover:border-indigo-300'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-slate-800 mb-2">
              Drop your resume here or click to browse
            </h4>
            <p className="text-slate-500 mb-4">Supports PDF files up to 10MB</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer"
            >
              <Upload className="h-5 w-5 mr-2" />
              Choose File
            </label>
          </div>
        ) : (
          <div className="border border-indigo-100 rounded-xl p-4 bg-white/60 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-indigo-600" />
                <div>
                  <p className="font-semibold text-slate-800">{uploadedFile.name}</p>
                  <p className="text-sm text-slate-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isAnalyzing && !analysis && (
                  <button
                    onClick={analyzeResume}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                  >
                    <Target className="h-4 w-4 mr-2 inline" />
                    Analyze Resume
                  </button>
                )}
                <button
                  onClick={removeFile}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isAnalyzing && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Analyzing Resume...</span>
                  <span className="text-sm text-slate-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Overall Score */}
          {/* Overall Score */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 border border-indigo-500/50 shadow-xl shadow-indigo-500/20 backdrop-blur-sm text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold font-outfit">Analysis Results</h3>
              <div className="flex items-center space-x-2">
                <Star className="h-6 w-6 text-yellow-300" />
                <span className="text-2xl font-bold font-outfit">{analysis.overallScore}/100</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-indigo-100">Experience Level</p>
                <p className="text-lg font-semibold font-outfit">{analysis.experienceLevel}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-indigo-100">Skills Found</p>
                <p className="text-lg font-semibold font-outfit">{analysis.skillsFound.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-indigo-100">Job Matches</p>
                <p className="text-lg font-semibold font-outfit">{analysis.jobMatches.length}</p>
              </div>
            </div>
          </div>

          {/* Skills Gap Analysis */}
          {/* Skills Gap Analysis */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-indigo-600" />
              Skills Gap Analysis
            </h3>
            <div className="space-y-4">
              {analysis.skillsGap.map((skill) => (
                <div key={skill.skill} className="p-4 border border-slate-200 rounded-xl bg-white/60 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-slate-800 font-outfit">{skill.skill}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(skill.priority).replace('bg-white/5 border border-white/10', 'bg-slate-50 text-slate-500 border-slate-200')}`}>
                        {skill.priority} priority
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {skill.currentLevel}% / {skill.targetLevel}% required
                    </span>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-indigo-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${skill.currentLevel}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-amber-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${skill.targetLevel}%` }}
                      ></div>
                    </div>
                  </div>
                  {skill.gap > 0 && (
                    <p className="text-sm text-amber-600 font-medium">
                      Gap: {skill.gap} points to reach target level
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Job Matches */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6 flex items-center">
              <Target className="h-6 w-6 mr-2 text-emerald-600" />
              Job Matches
            </h3>
            {analysis.jobMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysis.jobMatches.map((job, index) => (
                  <div key={index} className="border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white font-outfit">{job.title}</h4>
                      <span className="text-lg font-bold text-green-400 font-outfit">{job.matchPercentage}%</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{job.company}</p>
                    {job.location && <p className="text-xs text-gray-500 mb-1">📍 {job.location}</p>}
                    {job.salary && <p className="text-xs text-green-400 mb-2 font-medium">💰 {job.salary}</p>}
                    {job.description && <p className="text-xs text-gray-400 mb-3 line-clamp-3">{job.description}</p>}

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-green-400 mb-1">Strong Points:</p>
                        <div className="flex flex-wrap gap-1">
                          {job.strongPoints.map((point) => (
                            <span key={point} className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20">
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-orange-400 mb-1">Missing Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {job.missingSkills.map((skill) => (
                            <span key={skill} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded border border-orange-500/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <a
                      href={job.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full mt-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 text-sm backdrop-blur-sm border border-white/10 text-center"
                    >
                      View Full Job Description
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <Target className="h-12 w-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">No Job Matches Found</h4>
                <p className="text-gray-400 mb-4">
                  We couldn't find any job matches for your current skills. Try improving your skills or selecting a different role.
                </p>
                <button
                  onClick={() => setSelectedJobRole('software-engineer')}
                  className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  Try Software Engineer Role
                </button>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
            <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 mr-2 text-amber-500" />
              AI Recommendations
            </h3>
            {(() => {
              const toShow = (analysis.recommendations && analysis.recommendations.length > 0)
                ? analysis.recommendations
                : generateFallbackRecommendations(analysis);
              return (
                <div className="space-y-3">
                  {toShow.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-amber-50 backdrop-blur-sm rounded-xl border border-amber-200">
                      <Zap className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-700">{rec}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={generateLearningRoadmap}
              disabled={isGeneratingRoadmap}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingRoadmap ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5 mr-2" />
              )}
              {isGeneratingRoadmap ? 'Generating...' : 'Generate Learning Roadmap'}
            </button>
            <button
              onClick={startCareerSimulation}
              disabled={isStartingSimulation}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingSimulation ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Award className="h-5 w-5 mr-2" />
              )}
              {isStartingSimulation ? 'Starting...' : 'Start Career Simulation'}
            </button>
            <button
              onClick={() => analyzeResume()}
              className="px-6 py-3 border border-slate-200 bg-white text-slate-600 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all duration-300 flex items-center justify-center shadow-sm"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Re-analyze
            </button>
            <button
              onClick={() => {
                if (analysisId) {
                  setShowFullModal(true);
                } else {
                  alert('Analysis ID not available. Please re-analyze your resume first.');
                }
              }}
              className="px-6 py-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all duration-300 shadow-sm"
            >
              View full analysis
            </button>
          </div>
        </div>
      )}
      {/* Learning Roadmap Section */}
      {/* Learning Roadmap Section */}
      {roadmap && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
          <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6 flex items-center">
            <ArrowRight className="h-6 w-6 mr-2 text-indigo-500" />
            AI-Generated Learning Roadmap
          </h3>

          {/* Stage 1: Critical Gaps */}
          {roadmap.stage_1_critical_gaps && roadmap.stage_1_critical_gaps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                <span className="mr-2">🚨</span> Stage 1: Critical Skill Gaps <span className="text-sm font-normal text-slate-500 ml-2">(1-2 months)</span>
              </h4>
              <div className="space-y-3">
                {roadmap.stage_1_critical_gaps.map((skill: any, index: number) => (
                  <div key={index} className="p-4 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-slate-800 font-outfit">{skill.skill}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(skill.priority).replace('bg-white/5 border border-white/10', 'bg-slate-50 text-slate-500 border-slate-200')}`}>
                        {skill.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">Timeline: {skill.timeline}</p>

                    {/* YouTube Videos */}
                    {(() => {
                      const videos = (skill.youtube_videos && skill.youtube_videos.length > 0)
                        ? skill.youtube_videos.slice(0, 2)
                        : buildYouTubeFallbackVideos(skill.skill, 2);
                      return (
                        <div className="mb-3">
                          <div className="flex items-center mb-2">
                            <Youtube className="h-4 w-4 text-rose-500 mr-1" />
                            <p className="text-sm font-medium text-slate-600">Learning Videos</p>
                          </div>
                          <div className="space-y-2">
                            {videos.map((video: any, i: number) => (
                              <YouTubeVideoCard key={i} video={video} compact={true} />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Exam Preparation */}
                    {skill.exam_preparation && skill.exam_preparation.certifications && skill.exam_preparation.certifications.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-400 mb-1">📚 Certifications:</p>
                        <div className="flex flex-wrap gap-1">
                          {skill.exam_preparation.certifications.slice(0, 2).map((cert: string, i: number) => (
                            <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {skill.projects && skill.projects.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-1">🛠️ Projects:</p>
                        <div className="flex flex-wrap gap-1">
                          {skill.projects.slice(0, 2).map((project: any, i: number) => (
                            <span key={i} className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded">
                              {project.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage 2: Important Gaps */}
          {roadmap.stage_2_important_gaps && roadmap.stage_2_important_gaps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <span className="mr-2">⚠️</span> Stage 2: Important Skill Gaps <span className="text-sm font-normal text-gray-400 ml-2">(3-6 months)</span>
              </h4>
              <div className="space-y-3">
                {roadmap.stage_2_important_gaps.map((skill: any, index: number) => (
                  <div key={index} className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl hover:bg-yellow-500/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-white font-outfit">{skill.skill}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(skill.priority)}`}>
                        {skill.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">Timeline: {skill.timeline}</p>

                    {/* YouTube Videos */}
                    {(() => {
                      const videos = (skill.youtube_videos && skill.youtube_videos.length > 0)
                        ? skill.youtube_videos.slice(0, 2)
                        : buildYouTubeFallbackVideos(skill.skill, 2);
                      return (
                        <div className="mb-3">
                          <div className="flex items-center mb-2">
                            <Youtube className="h-4 w-4 text-yellow-500 mr-1" />
                            <p className="text-sm font-medium text-gray-300">Learning Videos</p>
                          </div>
                          <div className="space-y-2">
                            {videos.map((video: any, i: number) => (
                              <YouTubeVideoCard key={i} video={video} compact={true} />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Exam Preparation */}
                    {skill.exam_preparation && skill.exam_preparation.certifications && skill.exam_preparation.certifications.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-400 mb-1">📚 Certifications:</p>
                        <div className="flex flex-wrap gap-1">
                          {skill.exam_preparation.certifications.slice(0, 2).map((cert: string, i: number) => (
                            <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage 3: Nice-to-Have Gaps */}
          {roadmap.stage_3_nice_to_have && roadmap.stage_3_nice_to_have.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <span className="mr-2">💡</span> Stage 3: Nice-to-Have Skills <span className="text-sm font-normal text-gray-400 ml-2">(6-12 months)</span>
              </h4>
              <div className="space-y-3">
                {roadmap.stage_3_nice_to_have.map((skill: any, index: number) => (
                  <div key={index} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl hover:bg-blue-500/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-white font-outfit">{skill.skill}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(skill.priority)}`}>
                        {skill.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">Timeline: {skill.timeline}</p>

                    {/* YouTube Videos */}
                    {(() => {
                      const videos = (skill.youtube_videos && skill.youtube_videos.length > 0)
                        ? skill.youtube_videos.slice(0, 2)
                        : buildYouTubeFallbackVideos(skill.skill, 2);
                      return (
                        <div className="mb-3">
                          <div className="flex items-center mb-2">
                            <Youtube className="h-4 w-4 text-blue-500 mr-1" />
                            <p className="text-sm font-medium text-gray-300">Learning Videos</p>
                          </div>
                          <div className="space-y-2">
                            {videos.map((video: any, i: number) => (
                              <YouTubeVideoCard key={i} video={video} compact={true} />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Exam Preparation */}
                    {skill.exam_preparation && skill.exam_preparation.certifications && skill.exam_preparation.certifications.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-400 mb-1">📚 Certifications:</p>
                        <div className="flex flex-wrap gap-1">
                          {skill.exam_preparation.certifications.slice(0, 2).map((cert: string, i: number) => (
                            <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Resources */}
          {roadmap.learning_resources && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">📚 Learning Resources</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmap.learning_resources.courses && roadmap.learning_resources.courses.length > 0 && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <h5 className="font-semibold text-blue-400 mb-2">Courses</h5>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {roadmap.learning_resources.courses.map((course: string, i: number) => (
                        <li key={i}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {roadmap.learning_resources.platforms && roadmap.learning_resources.platforms.length > 0 && (
                  <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <h5 className="font-semibold text-green-400 mb-2">Platforms</h5>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {roadmap.learning_resources.platforms.map((platform: string, i: number) => (
                        <li key={i}>• {platform}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Metrics */}
          {roadmap.success_metrics && roadmap.success_metrics.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">🎯 Success Metrics</h4>
              <div className="flex flex-wrap gap-2">
                {roadmap.success_metrics.map((metric: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-sm">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Career Simulation Section */}
      {simulation && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
          <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6 flex items-center">
            <Award className="h-6 w-6 mr-2 text-emerald-500" />
            Career Simulation
          </h3>

          {/* Scenarios */}
          {simulation.scenarios && simulation.scenarios.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">🎮 Career Scenarios</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {simulation.scenarios.map((scenario: any, index: number) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                    <h5 className="font-semibold text-white mb-2">{scenario.title}</h5>
                    <p className="text-sm text-gray-400 mb-2">{scenario.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-1 rounded ${scenario.difficulty === 'beginner' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        scenario.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {scenario.difficulty}
                      </span>
                      <span className="text-gray-500">{scenario.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Simulations */}
          {simulation.interview_simulations && simulation.interview_simulations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">💼 Interview Simulations</h4>
              <div className="space-y-4">
                {simulation.interview_simulations.map((interview: any, index: number) => (
                  <div key={index} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-blue-300">{interview.company} - {interview.role}</h5>
                      <span className={`px-2 py-1 rounded text-xs ${interview.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        interview.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {interview.difficulty}
                      </span>
                    </div>
                    {interview.questions && interview.questions.slice(0, 2).map((question: any, qIndex: number) => (
                      <div key={qIndex} className="mb-2 p-2 bg-black/20 rounded border border-white/5">
                        <p className="text-sm font-medium text-gray-300">{question.question}</p>
                        <span className="text-xs text-gray-500">{question.type}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Objectives */}
          {simulation.learning_objectives && simulation.learning_objectives.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">🎯 Learning Objectives</h4>
              <div className="flex flex-wrap gap-2">
                {simulation.learning_objectives.map((objective: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm">
                    {objective}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showFullModal && analysisId && (
        <FullAnalysisModal id={analysisId} onClose={() => setShowFullModal(false)} />
      )}
    </div>
  );
};

export default ResumeUpload;