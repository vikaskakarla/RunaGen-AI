import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Simple brand SVGs (accessible, lightweight)
// Social icons removed as social login is currently disabled

const interests = [
  'Software Development',
  'Data Science / AI',
  'Product Management',
  'Design / UX',
  'Marketing / Business Analytics',
  'Product Design',
  'Engineering Management',
  'Other'
];

const experience = [
  'Beginner (0-2 years)',
  'Mid-Level (2-5 years)',
  'Senior (5-8 years)',
  'Expert (8+ years)'
];

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [careerInterest, setCareerInterest] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length > 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0-4
  }, [password]);


  const isStrong = useMemo(() => strength === 4, [strength]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName) newErrors.fullName = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!accepted) newErrors.terms = 'Please accept the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitted(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitted(false);
      navigate('/app');
    }, 1500);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0A0A0B]">
      {/* Dynamic Cyan/Blue Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-cyan-600/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[140px]"
        />
        <div className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-4xl px-6 py-12"
      >
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left Side: Brand & Visuals */}
          <div className="lg:col-span-2 hidden lg:block space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform duration-300 shadow-2xl">
                <img src="/runagen-logo.svg" alt="Runa" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <span className="block text-2xl font-black font-outfit tracking-tighter text-white uppercase">RUNA GEN</span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase">Intelligence</span>
              </div>
            </div>

            <h2 className="text-4xl font-black font-outfit text-white leading-tight uppercase">
              Start Your <span className="premium-gradient">AI Journey</span>
            </h2>
            <p className="text-lg text-gray-300 font-medium leading-relaxed">
              Join thousands of professionals using Gemini-powered intelligence to accelerate their careers.
            </p>

            <div className="space-y-4 pt-6">
              {[
                { title: "Precision Insights", desc: "Powered by Gemini 2.5" },
                { title: "Smart Matching", desc: "ATS Optimized" },
                { title: "Real-time Growth", desc: "Continuous Learning" }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                  <div>
                    <div className="text-sm font-black text-white uppercase tracking-widest">{feature.title}</div>
                    <div className="text-xs text-gray-400">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Form Container */}
          <div className="lg:col-span-3">
            <div className="glass-dark rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="mb-10 lg:hidden text-center">
                <h1 className="text-3xl font-black font-outfit text-white mb-2 uppercase">Create Account</h1>
                <p className="text-gray-300 font-medium tracking-wide">Join the next generation of career development.</p>
              </div>

              {errors.form && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center font-bold">
                  {errors.form}
                </div>
              )}

              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                  />
                  {errors.fullName && <p className="text-xs text-red-400 ml-1 font-bold">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                  />
                  {errors.email && <p className="text-xs text-red-400 ml-1 font-bold">{errors.email}</p>}
                </div>

                <div className="space-y-2 relative">
                  <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${strength <= 1 ? 'w-1/4 bg-red-400' : strength === 2 ? 'w-2/4 bg-amber-400' : strength === 3 ? 'w-3/4 bg-lime-400' : 'w-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'}`} />
                  </div>
                  {errors.password && <p className="text-xs text-red-400 ml-1 font-bold">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-400 ml-1 font-bold">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="careerInterest" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Career Goal</label>
                  <select
                    id="careerInterest"
                    value={careerInterest}
                    onChange={(e) => setCareerInterest(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-premium-black">Select Interest</option>
                    {interests.map((opt) => (
                      <option key={opt} value={opt} className="bg-premium-black">{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="experience" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Experience</label>
                  <select
                    id="experience"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none cursor-pointer"
                  >
                    {experience.map((opt) => (
                      <option key={opt} value={opt} className="bg-premium-black">{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-start gap-4 py-2">
                  <div className="relative mt-1">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="peer hidden"
                    />
                    <div className="w-5 h-5 rounded-lg border border-white/10 bg-white/5 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                      <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <label htmlFor="terms" className="text-sm text-gray-400 font-medium">
                    I agree to the <button onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-white hover:text-cyan-400 transition-colors underline-offset-4 underline font-bold">Terms</button> and <button onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-white hover:text-cyan-400 transition-colors underline-offset-4 underline font-bold">Privacy Policy</button>.
                  </label>
                </div>

                <div className="md:col-span-2 pt-4">
                  <Button
                    size="lg"
                    disabled={!isStrong || submitted}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black font-outfit text-xl py-8 rounded-[1.5rem] transition-all duration-300 shadow-[0_20px_40px_rgba(6,182,212,0.2)] disabled:opacity-50"
                    type="submit"
                  >
                    <span className="tracking-widest uppercase">{submitted ? 'Creating Account...' : 'Get Started Now'}</span>
                  </Button>
                </div>
              </form>

              <p className="mt-8 text-center text-gray-400 font-medium text-sm">
                Already have an impact? <Link to="/login" className="text-white hover:text-cyan-400 font-black transition-colors uppercase tracking-widest text-xs">Log In First</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Terms & Privacy Modals would follow the same glassy dark pattern... */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTerms(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-2xl glass-dark rounded-[3rem] border border-white/10 p-10 overflow-hidden">
            <div className="premium-gradient h-1 w-full absolute top-0 left-0" />
            <h2 className="text-3xl font-black font-outfit text-white mb-6">Terms of Service</h2>
            <div className="max-h-[50vh] overflow-y-auto pr-4 scrollbar-hide text-gray-400 space-y-4 font-medium leading-relaxed">
              <p>Welcome to Runa Gen AI. By using our service, you agree to...</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Professional conduct within career simulations.</li>
                <li>Responsible use of AI-generated insights.</li>
                <li>Protection of your account credentials.</li>
              </ul>
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => setShowTerms(false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">Close</button>
              <button
                onClick={() => { setAccepted(true); setShowTerms(false); }}
                className="flex-1 py-4 rounded-2xl bg-white text-premium-black font-black hover:bg-gray-100 transition-all"
              >
                I Accept
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Privacy modal similarly redesigned */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPrivacy(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-2xl glass-dark rounded-[3rem] border border-white/10 p-10 overflow-hidden">
            <div className="premium-gradient h-1 w-full absolute top-0 left-0" />
            <h2 className="text-3xl font-black font-outfit text-white mb-6">Privacy Policy</h2>
            <div className="max-h-[50vh] overflow-y-auto pr-4 scrollbar-hide text-gray-400 space-y-4 font-medium leading-relaxed">
              <p>Your privacy is our priority at Runa Gen AI.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>We collect data only to provide core career features.</li>
                <li>Your personal information is encrypted and never sold.</li>
                <li>You maintain full control over your data export/deletion.</li>
              </ul>
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => setShowPrivacy(false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">Close</button>
              <button
                onClick={() => { setAccepted(true); setShowPrivacy(false); }}
                className="flex-1 py-4 rounded-2xl bg-white text-premium-black font-black hover:bg-gray-100 transition-all"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
