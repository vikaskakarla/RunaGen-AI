import React, { useState, useEffect } from 'react';
import {
  User, Mail, Building, Target, MapPin, Monitor,
  Brain, Award, FileText, CheckCircle, AlertCircle,
  Save, RefreshCw, Eye,
  Home, Briefcase, GraduationCap, Heart, Settings,
  Trash2, Shield, Upload, LogOut, Edit, Plus
} from 'lucide-react';

interface BasicInfo {
  name: string;
  email: string;
  university?: string;
  currentCompany?: string;
  careerGoal: string;
  careerGoalReason: string;
}

interface CareerPreferences {
  preferredIndustries: string[];
  preferredLocations: string[];
  workMode: 'remote' | 'on-site' | 'hybrid';
  targetRoles: string[];
}

interface PersonalityResult {
  personalityType: string;
  suggestedCareerTracks: string[];
  lastQuizScore?: number | null;
  lastQuizDate: string;
}

interface ResumeIntegration {
  lastUploadDate?: string;
  skillsPresent: string[];
  skillsMissing: string[];
  matchScore: number;
  overallScore: number;
  uploads: { id: string; fileName: string; uploadedAt: string }[];
}

interface ProfileSettingsProps {
  onSave?: (profileData: any) => void;
  onClose?: () => void;
  initialData?: any;
  initialResumeData?: any;
  skillsProfile?: any;  // Skills profile from resume analysis
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSave, onClose, initialData, initialResumeData, skillsProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  // Load initial data from props (live DB data) or fallback to defaults
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(() => {
    return {
      name: initialData?.fullName || initialData?.name || "",
      email: initialData?.email || "",
      university: initialData?.university || initialData?.education || "",
      currentCompany: initialData?.currentCompany || "",
      careerGoal: initialData?.careerTrack || initialData?.careerInterest || "",
      careerGoalReason: initialData?.bio || ""
    };
  });

  const [careerPreferences, setCareerPreferences] = useState<CareerPreferences>(() => {
    // Initialize from DB data if available
    if (initialData?.preferences) {
      return {
        preferredIndustries: initialData.preferences.industries || ['Technology', 'Finance'],
        preferredLocations: initialData.preferences.locations || ['San Francisco', 'Remote'],
        workMode: initialData.preferences.workMode || 'hybrid',
        targetRoles: initialData.preferences.targetRoles || ['Data Analyst']
      };
    }
    // Fallback defaults
    return {
      preferredIndustries: ['Technology', 'Finance'],
      preferredLocations: ['San Francisco', 'Remote'],
      workMode: 'hybrid',
      targetRoles: ['Data Analyst']
    };
  });

  /* 
   * Personality Result initialization
   * If initialData.personality is a string like "Analytical Explorer", we map it.
   * We also look for personalityTracks and date if available (added to backend schema).
   */
  const [personalityResult, setPersonalityResult] = useState<PersonalityResult>(() => {
    return {
      personalityType: "", // Deprecated, kept for interface compat if mostly unused
      suggestedCareerTracks: [], // Deprecated
      lastQuizScore: initialData?.lastQuizScore !== undefined ? initialData.lastQuizScore : null,
      lastQuizDate: initialData?.personalityDate || null
    };
  });

  const [resumeIntegration] = useState<ResumeIntegration>(() => {
    if (initialResumeData) {
      return {
        lastUploadDate: new Date().toISOString().split('T')[0], // Approximate since we don't store upload date in analysis
        skillsPresent: initialResumeData.skillsFound || [],
        skillsMissing: (initialResumeData.skillsGap || []).map((s: any) => s.skill),
        matchScore: initialResumeData.overallScore || 0,
        overallScore: initialResumeData.overallScore || 0,
        uploads: [
          // Mocking latest upload entry since backend doesn't store file history yet
          { id: 'u1', fileName: 'Current_Resume.pdf', uploadedAt: new Date().toISOString().split('T')[0] }
        ]
      };
    }
    return {
      lastUploadDate: "",
      skillsPresent: [],
      skillsMissing: [],
      matchScore: 0,
      overallScore: 0,
      uploads: []
    };
  });


  // Settings initialization
  const [isStudent, setIsStudent] = useState(initialData?.settings?.isStudent ?? true);
  const [manualSkills, setManualSkills] = useState<string[]>(initialData?.manualSkills || ['Critical Thinking']);
  const [newSkill, setNewSkill] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(initialData?.settings?.isPublic ?? true);

  const [notifications, setNotifications] = useState(() => {
    if (initialData?.settings?.notifications) {
      return {
        productUpdates: initialData.settings.notifications.product,
        reminders: initialData.settings.notifications.reminders,
        mentorMessages: initialData.settings.notifications.mentor
      };
    }
    return {
      productUpdates: true,
      reminders: true,
      mentorMessages: true
    };
  });

  // Sync state with props when initialData changes (e.g. after quiz completion)
  useEffect(() => {
    if (initialData) {
      setBasicInfo({
        name: initialData.fullName || initialData.name || "",
        email: initialData.email || "",
        university: initialData.university || initialData.education || "",
        currentCompany: initialData.currentCompany || "",
        careerGoal: initialData.careerTrack || initialData.careerInterest || "",
        careerGoalReason: initialData.bio || ""
      });

      // Update Personality / Quiz Result
      setPersonalityResult({
        personalityType: "",
        suggestedCareerTracks: [],
        lastQuizScore: initialData.lastQuizScore !== undefined ? initialData.lastQuizScore : null,
        lastQuizDate: initialData.personalityDate || null
      });

      // Update Career Preferences
      if (initialData.preferences) {
        setCareerPreferences({
          preferredIndustries: initialData.preferences.industries || ['Technology', 'Finance'],
          preferredLocations: initialData.preferences.locations || ['San Francisco', 'Remote'],
          workMode: initialData.preferences.workMode || 'hybrid',
          targetRoles: initialData.preferences.targetRoles || ['Data Analyst']
        });
      }

      // Update Settings & Skills
      if (initialData.manualSkills) setManualSkills(initialData.manualSkills);
      if (initialData.settings) {
        setIsStudent(initialData.settings.isStudent ?? true);
        setIsPublic(initialData.settings.isPublic ?? true);
        if (initialData.settings.notifications) {
          setNotifications({
            productUpdates: initialData.settings.notifications.product,
            reminders: initialData.settings.notifications.reminders,
            mentorMessages: initialData.settings.notifications.mentor
          });
        }
      }
    }
  }, [initialData]);

  // Quiz logic moved to PersonalityQuiz.tsx
  // We keep this component read-only for personality results
  // Unused state can be cleaned up or left as placeholder if refactoring excessively


  // Removed handleStartQuiz, handleQuizAnswer, handleQuizComplete implementation as they are now in PersonalityQuiz


  const [xp] = useState(initialData?.xp || 0);
  const [xpToNext] = useState(initialData?.xpToNext || 1000);
  const [badgesSummary] = useState({
    earned: (initialData?.badges || []).filter((b: any) => b.earned).length,
    total: Math.max((initialData?.badges || []).length, 12)
  });

  const [availableIndustries, setAvailableIndustries] = useState<string[]>([
    'Technology', 'Finance', 'Healthcare', 'Education', 'Marketing',
    'Consulting', 'Manufacturing', 'Retail', 'Government', 'Non-profit',
    ...(initialData?.preferences?.industries || [])
  ]);

  const [availableLocations, setAvailableLocations] = useState<string[]>([
    'San Francisco', 'New York', 'Seattle', 'Austin', 'Boston',
    'Chicago', 'Los Angeles', 'Denver', 'Remote', 'Hybrid',
    ...(initialData?.preferences?.locations || [])
  ]);

  const [availableRoles, setAvailableRoles] = useState<string[]>([
    'Data Analyst', 'Software Engineer', 'Product Manager', 'UX Designer',
    'Marketing Manager', 'Business Analyst', 'Data Scientist', 'Project Manager',
    ...(initialData?.preferences?.targetRoles || [])
  ]);

  useEffect(() => {
    setAvailableIndustries(prev => Array.from(new Set(prev)));
    setAvailableLocations(prev => Array.from(new Set(prev)));
    setAvailableRoles(prev => Array.from(new Set(prev)));
  }, []);

  const workModes = [
    { value: 'remote', label: 'Remote', icon: Home },
    { value: 'on-site', label: 'On-site', icon: Building },
    { value: 'hybrid', label: 'Hybrid', icon: Monitor }
  ];

  const [customInputs, setCustomInputs] = useState({
    industry: '',
    location: '',
    role: ''
  });

  const handleAddCustom = (type: 'industry' | 'location' | 'role') => {
    const value = customInputs[type].trim();
    if (!value) return;

    if (type === 'industry') {
      if (!availableIndustries.includes(value)) {
        setAvailableIndustries(prev => [...prev, value]);
      }
      if (!careerPreferences.preferredIndustries.includes(value)) {
        handleIndustryToggle(value);
      }
      setCustomInputs(prev => ({ ...prev, industry: '' }));
    } else if (type === 'location') {
      if (!availableLocations.includes(value)) {
        setAvailableLocations(prev => [...prev, value]);
      }
      if (!careerPreferences.preferredLocations.includes(value)) {
        handleLocationToggle(value);
      }
      setCustomInputs(prev => ({ ...prev, location: '' }));
    } else if (type === 'role') {
      if (!availableRoles.includes(value)) {
        setAvailableRoles(prev => [...prev, value]);
      }
      if (!careerPreferences.targetRoles.includes(value)) {
        handleRoleToggle(value);
      }
      setCustomInputs(prev => ({ ...prev, role: '' }));
    }
  };

  useEffect(() => {
    // Track changes to enable save button
    setHasChanges(true);
  }, [basicInfo, careerPreferences, personalityResult]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

      const body = {
        fullName: basicInfo.name,
        careerInterest: basicInfo.careerGoal,
        university: basicInfo.university,
        currentCompany: basicInfo.currentCompany,
        bio: basicInfo.careerGoalReason,
        preferences: {
          industries: careerPreferences.preferredIndustries,
          locations: careerPreferences.preferredLocations,
          workMode: careerPreferences.workMode,
          targetRoles: careerPreferences.targetRoles
        },
        manualSkills: manualSkills,
        personality: personalityResult.personalityType,
        settings: {
          isStudent,
          isPublic,
          notifications: {
            product: notifications.productUpdates,
            reminders: notifications.reminders,
            mentor: notifications.mentorMessages
          }
        }
      };

      console.log('Frontend sending profile update:', body);

      const storedUser = localStorage.getItem('user');
      const tempUserId = localStorage.getItem('temp_user_id');
      const userId = storedUser ? JSON.parse(storedUser).id : tempUserId;

      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (userId) {
        // Fallback for guest/demo users who might not have a valid JWT but have an ID
        headers['x-user-id'] = userId;
      }

      // Always include x-user-id if available to ensure middleware can identify the user
      // in case token is expired but we want granular error handling or fallback
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('storage'));
        onSave?.(data.user);
        setHasChanges(false);
        alert('Profile settings saved successfully! 🎉');
        return true;
      } else {
        const err = await response.json();
        alert(`Failed to save profile: ${err.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to connect to server');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleIndustryToggle = (industry: string) => {
    setCareerPreferences(prev => ({
      ...prev,
      preferredIndustries: prev.preferredIndustries.includes(industry)
        ? prev.preferredIndustries.filter(i => i !== industry)
        : [...prev.preferredIndustries, industry]
    }));
  };

  const handleLocationToggle = (location: string) => {
    setCareerPreferences(prev => ({
      ...prev,
      preferredLocations: prev.preferredLocations.includes(location)
        ? prev.preferredLocations.filter(l => l !== location)
        : [...prev.preferredLocations, location]
    }));
  };

  const handleRoleToggle = (role: string) => {
    setCareerPreferences(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  const handleAddSkill = () => {
    const val = newSkill.trim();
    if (!val) return;
    if (!manualSkills.includes(val)) setManualSkills(prev => [...prev, val]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setManualSkills(prev => prev.filter(s => s !== skill));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      // Notify backend about logout for audit logging
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : null;

        await fetch(`${(import.meta as any).env.VITE_API_BASE || 'http://localhost:3001'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-user-id': userId || ''
          }
        });
      } catch (error) {
        console.error('Background logout logging failed:', error);
        // We continue to local logout regardless of server success
      }

      // Clear all authentication and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedSkill');
      localStorage.removeItem('temp_user_id');
      localStorage.removeItem('last_analysis'); // Clean up any other potential artifacts

      // Force redirect to login page to ensure state is completely reset
      window.location.href = '/login';
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <User className="h-6 w-6 text-purple-400" />
        <h3 className="text-xl font-semibold text-white font-outfit">Basic Information</h3>
      </div>

      {/* Photo */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-2">Profile Photo</label>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {profilePhoto ? (
              <img src={profilePhoto} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
          </div>
          {isEditing && (
            <label className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors shadow-sm text-slate-600 hover:text-indigo-600">
              <Upload className="h-4 w-4 text-indigo-500" />
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          )}
          {profilePhoto && isEditing && (
            <button onClick={() => setProfilePhoto(null)} className="px-3 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4 inline mr-1" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-2">
          <User className="h-4 w-4 inline mr-1 text-indigo-500" />
          Full Name
        </label>
        {isEditing ? (
          <input
            type="text"
            value={basicInfo.name}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 placeholder-slate-400"
            placeholder="Enter your full name"
          />
        ) : (
          <p className="text-slate-900 font-medium px-4 py-3 bg-white/50 rounded-xl border border-slate-200">
            {basicInfo.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-2">
          <Mail className="h-4 w-4 inline mr-1 text-indigo-500" />
          Email / Contact Info
        </label>
        {isEditing ? (
          <input
            type="email"
            value={basicInfo.email}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 placeholder-slate-400"
            placeholder="your.email@example.com"
          />
        ) : (
          <p className="text-slate-900 font-medium px-4 py-3 bg-white/50 rounded-xl border border-slate-200">
            {basicInfo.email}
          </p>
        )}
      </div>

      {/* Student/Professional Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">Current Status</label>
        <div className="flex space-x-4">
          <button
            onClick={() => isEditing && setIsStudent(true)}
            disabled={!isEditing}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-300 ${isStudent
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
              : 'border-slate-200 text-slate-500 bg-white/50 hover:bg-white hover:text-indigo-600'
              } ${isEditing ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default opacity-90'}`}
          >
            <GraduationCap className="h-5 w-5" />
            <span>Student</span>
          </button>
          <button
            onClick={() => isEditing && setIsStudent(false)}
            disabled={!isEditing}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-300 ${!isStudent
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
              : 'border-slate-200 text-slate-500 bg-white/50 hover:bg-white hover:text-indigo-600'
              } ${isEditing ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default opacity-90'}`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Professional</span>
          </button>
        </div>
      </div>

      {/* University or Company */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-2">
          {isStudent ? (
            <>
              <GraduationCap className="h-4 w-4 inline mr-1 text-indigo-500" />
              University
            </>
          ) : (
            <>
              <Building className="h-4 w-4 inline mr-1 text-indigo-500" />
              Current Company
            </>
          )}
        </label>
        {isEditing ? (
          <input
            type="text"
            value={isStudent ? basicInfo.university || '' : basicInfo.currentCompany || ''}
            onChange={(e) => setBasicInfo(prev => ({
              ...prev,
              [isStudent ? 'university' : 'currentCompany']: e.target.value
            }))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 placeholder-slate-400"
            placeholder={isStudent ? "Your university name" : "Your current company"}
          />
        ) : (
          <p className="text-slate-900 font-medium px-4 py-3 bg-white/50 rounded-xl border border-slate-200">
            {(isStudent ? basicInfo.university : basicInfo.currentCompany) || (isStudent ? "No university listed" : "No company listed")}
          </p>
        )}
      </div>

      {/* Career Goal */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-2">
          <Target className="h-4 w-4 inline mr-1 text-indigo-500" />
          Career Goal
        </label>
        {isEditing ? (
          <input
            type="text"
            value={basicInfo.careerGoal}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, careerGoal: e.target.value }))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 placeholder-slate-400"
            placeholder="I want to be a..."
          />
        ) : (
          <p className="text-slate-900 font-medium px-4 py-3 bg-white/50 rounded-xl border border-slate-200">
            {basicInfo.careerGoal}
          </p>
        )}
        <p className="text-sm text-slate-500 mt-2">
          💡 This helps the AI mentor understand your aspirations and tailor recommendations accordingly.
        </p>
      </div>

      {/* Career Goal Reason */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-2">
          <Heart className="h-4 w-4 inline mr-1 text-indigo-500" />
          Why this career goal?
        </label>
        {isEditing ? (
          <textarea
            value={basicInfo.careerGoalReason}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, careerGoalReason: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 resize-none placeholder-slate-400"
            placeholder="Tell us what drives your passion for this career..."
          />
        ) : (
          <p className="text-slate-900 px-4 py-3 bg-white/50 rounded-xl border border-slate-200 min-h-[5rem] whitespace-pre-wrap">
            {basicInfo.careerGoalReason || "No context provided yet."}
          </p>
        )}
        <p className="text-sm text-slate-500 mt-2">
          💡 This context helps create more personalized roadmaps and simulations.
        </p>
      </div>
    </div>
  );

  const renderCareerPreferences = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="h-6 w-6 text-indigo-500" />
        <h3 className="text-xl font-semibold text-slate-800 font-outfit">Career Preferences</h3>
      </div>

      {/* Preferred Industries */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-3">
          <Building className="h-4 w-4 inline mr-1 text-indigo-500" />
          Preferred Industries
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableIndustries.map((industry) => (
            <button
              key={industry}
              onClick={() => isEditing && handleIndustryToggle(industry)}
              disabled={!isEditing}
              className={`p-3 rounded-lg border transition-all duration-300 text-left ${careerPreferences.preferredIndustries.includes(industry)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-slate-200 text-slate-500 bg-white/50 hover:bg-white hover:text-indigo-600'
                } ${isEditing ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default opacity-90'}`}
            >
              {industry}
            </button>
          ))}
          {isEditing && (
            <div className="flex items-center space-x-2 p-1 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400/50 focus-within:border-indigo-500/50 transition-colors">
              <input
                type="text"
                value={customInputs.industry}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, industry: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom('industry')}
                placeholder="Add Custom..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-600 text-sm px-2 py-1 placeholder-slate-400"
              />
              <button
                onClick={() => handleAddCustom('industry')}
                disabled={!customInputs.industry.trim()}
                className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          💡 Select industries that align with your interests and career goals.
        </p>
      </div>

      {/* Preferred Locations */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-3">
          <MapPin className="h-4 w-4 inline mr-1 text-emerald-500" />
          Preferred Locations
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableLocations.map((location) => (
            <button
              key={location}
              onClick={() => isEditing && handleLocationToggle(location)}
              disabled={!isEditing}
              className={`p-3 rounded-lg border transition-all duration-300 text-left ${careerPreferences.preferredLocations.includes(location)
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                : 'border-slate-200 text-slate-500 bg-white/50 hover:bg-white hover:text-emerald-600'
                } ${isEditing ? 'hover:border-emerald-300 cursor-pointer' : 'cursor-default opacity-90'}`}
            >
              {location}
            </button>
          ))}
          {isEditing && (
            <div className="flex items-center space-x-2 p-1 border-2 border-dashed border-slate-300 rounded-lg hover:border-emerald-400/50 focus-within:border-emerald-500/50 transition-colors">
              <input
                type="text"
                value={customInputs.location}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, location: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom('location')}
                placeholder="Add Custom..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-600 text-sm px-2 py-1 placeholder-slate-400"
              />
              <button
                onClick={() => handleAddCustom('location')}
                disabled={!customInputs.location.trim()}
                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-md disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          💡 This helps filter job matches and roadmaps to realistic opportunities.
        </p>
      </div>

      {/* Work Mode */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-3">
          <Monitor className="h-4 w-4 inline mr-1 text-purple-500" />
          Work Mode Preference
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => isEditing && setCareerPreferences(prev => ({ ...prev, workMode: mode.value as any }))}
                disabled={!isEditing}
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-all duration-300 ${careerPreferences.workMode === mode.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                  : 'border-slate-200 text-slate-500 bg-white/50 hover:bg-white hover:text-purple-600'
                  } ${isEditing ? 'hover:border-purple-300 cursor-pointer' : 'cursor-default opacity-90'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Target Roles */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-3">
          <Target className="h-4 w-4 inline mr-1 text-pink-500" />
          Target Roles
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableRoles.map((role) => (
            <button
              key={role}
              onClick={() => isEditing && handleRoleToggle(role)}
              disabled={!isEditing}
              className={`p-3 rounded-lg border transition-all duration-300 text-left ${careerPreferences.targetRoles.includes(role)
                ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                : 'border-slate-200 text-slate-500 bg-white/50 hover:bg-white hover:text-pink-600'
                } ${isEditing ? 'hover:border-pink-300 cursor-pointer' : 'cursor-default opacity-90'}`}
            >
              {role}
            </button>
          ))}
          {isEditing && (
            <div className="flex items-center space-x-2 p-1 border-2 border-dashed border-slate-300 rounded-lg hover:border-pink-400/50 focus-within:border-pink-500/50 transition-colors">
              <input
                type="text"
                value={customInputs.role}
                onChange={(e) => setCustomInputs(prev => ({ ...prev, role: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom('role')}
                placeholder="Add Custom..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-600 text-sm px-2 py-1 placeholder-slate-400"
              />
              <button
                onClick={() => handleAddCustom('role')}
                disabled={!customInputs.role.trim()}
                className="p-1 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-md disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* 
   * Render Skill Assessment Tab - Read Only View
   */
  const renderPersonalityQuiz = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Brain className="h-6 w-6 text-purple-600" />
        <h3 className="text-xl font-semibold text-slate-800 font-outfit">Skill Assessment Results</h3>
      </div>

      <div className="rounded-xl p-6 border border-slate-200 bg-white/60 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-800">Assessment Score</h4>
          {personalityResult.lastQuizDate && (
            <span className="text-sm text-slate-500">Last updated: {personalityResult.lastQuizDate.split('T')[0]}</span>
          )}
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg shadow-purple-500/20">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">
              {personalityResult.lastQuizScore !== null && personalityResult.lastQuizScore !== undefined
                ? `${personalityResult.lastQuizScore}%`
                : "Not Assessed Yet"}
            </p>
            <p className="text-sm text-slate-500">
              {personalityResult.lastQuizScore !== null && personalityResult.lastQuizScore !== undefined
                ? "Great job! Keep learning to improve your score."
                : "Visit the Dashboard to take the skill assessment."}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 text-sm rounded-lg flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          To retake the assessment, please visit the "Skill Assessment" card in your Dashboard.
        </div>
      </div>
    </div>
  );



  const renderResumeIntegration = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <FileText className="h-6 w-6 text-emerald-500" />
        <h3 className="text-xl font-semibold text-slate-800 font-outfit">Skills & Resume</h3>
      </div>

      {/* Skills Profile from Resume Analysis */}
      {skillsProfile && skillsProfile.targetCompany && skillsProfile.targetRole && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-green-900 flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Your Saved Skills Profile
              </h4>
              <p className="text-sm text-green-700 mt-1">
                <strong>{skillsProfile.targetCompany}</strong> - <strong>{skillsProfile.targetRole}</strong>
              </p>
              {skillsProfile.lastUpdated && (
                <p className="text-xs text-green-600 mt-1">
                  Last updated: {new Date(skillsProfile.lastUpdated).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-xs text-green-600 bg-green-100 px-3 py-2 rounded-full">
              {skillsProfile.skills?.length || 0} skills • {skillsProfile.skillGaps?.length || 0} gaps
            </div>
          </div>

          {/* Skills from Profile */}
          {skillsProfile.skills && skillsProfile.skills.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                Your Skills ({skillsProfile.skills.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {skillsProfile.skills.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-lg text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skill Gaps from Profile */}
          {skillsProfile.skillGaps && skillsProfile.skillGaps.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-amber-900 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
                Skills to Develop ({skillsProfile.skillGaps.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {skillsProfile.skillGaps.map((gap: any, index: number) => (
                  <span key={index} className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm font-medium">
                    {gap.skill}
                    {gap.priority && (
                      <span className={`ml-1 text-xs ${gap.priority === 'high' ? 'text-red-600' :
                          gap.priority === 'medium' ? 'text-orange-600' :
                            'text-yellow-600'
                        }`}>
                        ({gap.priority})
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-700 mt-2">
                💡 Focus on these skills to match your target role at {skillsProfile.targetCompany}
              </p>
            </div>
          )}
        </div>
      )}

      {resumeIntegration.lastUploadDate ? (
        <>
          {/* Resume Analysis Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-800">Last Resume Analysis</h4>
              <span className="text-sm text-slate-500">Uploaded: {resumeIntegration.lastUploadDate}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-slate-500">Overall Score</p>
                <p className="text-2xl font-bold text-slate-800 font-outfit">{resumeIntegration.overallScore}/100</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Career Match</p>
                <p className="text-2xl font-bold text-slate-800 font-outfit">{resumeIntegration.matchScore}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Skills Found</p>
                <p className="text-2xl font-bold text-slate-800 font-outfit">{resumeIntegration.skillsPresent.length}</p>
              </div>
            </div>

            <button className="bg-gradient-to-r from-emerald-500 to-sky-500 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 shadow-sm">
              <Eye className="h-4 w-4 mr-2 inline" />
              Go to Resume Analysis
            </button>
          </div>

          {/* Resume uploads history */}
          <div>
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Uploaded Resumes</h4>
            <div className="space-y-2">
              {resumeIntegration.uploads.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/50 border border-slate-200 rounded-lg shadow-sm">
                  <span className="text-sm text-slate-700">{u.fileName}</span>
                  <span className="text-xs text-slate-500">{u.uploadedAt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Present */}
          <div>
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-emerald-500" />
              Skills Present ✅
            </h4>
            <div className="flex flex-wrap gap-2">
              {resumeIntegration.skillsPresent.map((skill) => (
                <span key={skill} className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Skills Missing */}
          <div>
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
              Missing Skills ❌
            </h4>
            <div className="flex flex-wrap gap-2">
              {resumeIntegration.skillsMissing.map((skill) => (
                <span key={skill} className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">
              💡 Focus on these skills to improve your career match score.
            </p>
          </div>

          {/* Manual Skills */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">Your Manual Skills</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {manualSkills.map((s) => (
                <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-sm flex items-center">
                  {s}
                  <button onClick={() => handleRemoveSkill(s)} className="ml-2 text-indigo-400 hover:text-indigo-600">×</button>
                </span>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400"
              />
              <button onClick={handleAddSkill} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/20 transition-all">Add</button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white/50 rounded-xl border border-slate-200 backdrop-blur-sm">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-800 mb-2">No Resume Uploaded</h4>
          <p className="text-slate-500 mb-4">Upload your resume to get personalized insights and career matching.</p>
          <button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 shadow-sm">
            Upload Resume
          </button>
        </div>
      )}
    </div>
  );

  /* 
   * Render Progress & Badges
   */
  /* 
   * Render Progress & Badges
   */
  const renderProgressAndBadges = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Award className="h-6 w-6 text-amber-500" />
        <h3 className="text-xl font-semibold text-slate-800 font-outfit">Progress & Badges</h3>
      </div>
      <div className="bg-white/60 rounded-xl p-6 border border-slate-200 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">XP Level</span>
          <span className="text-sm text-slate-500">{xp}/{xp + xpToNext}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-3 rounded-full shadow-sm" style={{ width: `${(xp / (xp + xpToNext)) * 100}%` }} />
        </div>
        <p className="text-sm text-slate-500 mt-2">Badges earned: {badgesSummary.earned}</p>
      </div>

      {/* Badges List */}
      <div className="bg-white/60 rounded-xl p-6 border border-slate-200 shadow-sm backdrop-blur-sm">
        <h4 className="text-sm font-semibold text-slate-800 mb-4">Your Collection</h4>
        {initialData?.badges && initialData.badges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {initialData.badges.map((badge: any, index: number) => (
              <div key={badge.id || index} className={`flex flex-col items-center p-3 rounded-lg border ${badge.earned ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                <div className="text-2xl mb-2">{badge.icon || '🏆'}</div>
                <span className="text-xs font-medium text-slate-800 text-center">{badge.name}</span>
                <span className="text-[10px] text-slate-500 text-center mt-1">{badge.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No badges earned yet. Complete challenges to earn distinct badges!</p>
        )}
      </div>

      <div className="text-sm text-slate-500">Upcoming milestone: Reach level {Math.floor((initialData?.level || 1) + 1)} to unlock new features.</div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="h-6 w-6 text-indigo-500" />
        <h3 className="text-xl font-semibold text-slate-800 font-outfit">Privacy & Settings</h3>
      </div>
      <div className="bg-white/60 rounded-xl p-6 border border-slate-200 space-y-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">Public Profile</p>
            <p className="text-sm text-slate-500">Make your profile visible in the peer hub</p>
          </div>
          <button onClick={() => isEditing && setIsPublic(v => !v)} disabled={!isEditing} className={`px-4 py-2 rounded-lg border transition-all duration-300 ${isPublic ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white/50 border-slate-200 text-slate-400'} ${!isEditing && 'opacity-70 cursor-not-allowed'}`}>
            {isPublic ? 'Public' : 'Private'}
          </button>
        </div>
        <div>
          <p className="font-medium text-slate-800 mb-2">Notifications</p>
          <div className="space-y-2 text-slate-600">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" disabled={!isEditing} checked={notifications.productUpdates} onChange={(e) => setNotifications({ ...notifications, productUpdates: e.target.checked })} className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500/50" />
              <span>Product updates</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" disabled={!isEditing} checked={notifications.reminders} onChange={(e) => setNotifications({ ...notifications, reminders: e.target.checked })} className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500/50" />
              <span>Reminders & nudges</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" disabled={!isEditing} checked={notifications.mentorMessages} onChange={(e) => setNotifications({ ...notifications, mentorMessages: e.target.checked })} className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500/50" />
              <span>AI mentor messages</span>
            </label>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
          <button onClick={handleLogout} className="px-4 py-2 border border-rose-200 text-rose-500 rounded-lg hover:bg-rose-50 flex items-center transition-colors">
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </button>
          <button className="px-4 py-2 mr-3 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">Reset progress</button>
          <button className="px-4 py-2 border border-rose-200 text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">Delete account</button>
        </div>
      </div>
    </div>
  );

  const sections = [
    { id: 'basic', label: 'Personal Info', icon: User },
    { id: 'career', label: 'Career Preferences', icon: Target },
    { id: 'resume', label: 'Skills & Resume', icon: FileText },
    { id: 'personality', label: 'Personality Quiz', icon: Brain },
    { id: 'progress', label: 'Progress & Badges', icon: Award },
    { id: 'privacy', label: 'Privacy & Settings', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-3xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/60 shadow-2xl shadow-indigo-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-indigo-100 bg-white/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg shadow-lg shadow-indigo-500/30">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 font-outfit">Profile Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-indigo-100 p-4 hidden md:block">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${activeSection === section.id
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white/40">
            {activeSection === 'basic' && renderBasicInfo()}
            {activeSection === 'career' && renderCareerPreferences()}
            {activeSection === 'resume' && renderResumeIntegration()}
            {activeSection === 'personality' && renderPersonalityQuiz()}
            {activeSection === 'progress' && renderProgressAndBadges()}
            {activeSection === 'privacy' && renderPrivacySettings()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-indigo-100 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <div className="flex items-center space-x-2 text-amber-500 animate-pulse">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">You have unsaved changes</span>
              </div>
            )}
          </div>
          <div className="flex space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                  }}
                  className="px-6 py-2 bg-white text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors border border-slate-200 hover:text-indigo-600 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const success = await handleSave();
                    if (success) {
                      setIsEditing(false);
                    }
                  }}
                  disabled={isSaving}
                  className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${isSaving
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 shadow-md'
                    }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save & Sync</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 flex items-center space-x-2 shadow-md"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
