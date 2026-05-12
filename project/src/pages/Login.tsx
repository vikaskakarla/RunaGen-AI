import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

// Simple brand SVGs (accessible, lightweight)
// Social icons removed as social login is currently disabled

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email) next.email = 'Email is required';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Navigate to dashboard
      // TODO: Replace with actual dashboard route
      navigate('/app');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrors({ form: err.message });
      setIsSubmitting(false);
    }
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
        className="relative z-10 w-full max-w-md px-6 py-12"
      >
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 w-16 h-16 bg-white rounded-[1.25rem] flex items-center justify-center border border-white/20 shadow-2xl">
            <img src="/runagen-logo.svg" alt="Runa" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-4xl font-black font-outfit text-white tracking-widest mb-2 uppercase">Welcome Back</h1>
          <p className="text-gray-400 font-medium tracking-wide">Continue your AI-powered career journey.</p>
        </div>

        <div className="glass-dark rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
          {/* Top border glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

          {errors.form && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center font-bold">
              {errors.form}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 hover:text-white transition-colors font-bold"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 pr-12 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 ml-1 font-bold">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer hidden" />
                  <div className="w-5 h-5 rounded-lg border border-white/10 bg-white/5 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                    <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-sm text-gray-400 font-medium group-hover:text-white transition-colors">Remember me</span>
              </label>
            </div>

            <Button
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black font-outfit text-xl py-8 rounded-[1.5rem] transition-all duration-300 shadow-[0_20px_40px_rgba(6,182,212,0.2)] disabled:opacity-50"
              type="submit"
            >
              <span className="tracking-widest uppercase">{isSubmitting ? 'Authenticating...' : 'Sign In Now'}</span>
            </Button>
          </form>

          <p className="mt-8 text-center text-gray-400 font-medium text-sm">
            New to Runa? <Link to="/signup" className="text-white hover:text-cyan-400 font-black transition-colors uppercase tracking-widest text-xs">Create Account</Link>
          </p>
        </div>
      </motion.div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onLogin={() => {
          setShowForgotPassword(false);
          // Optional: You could auto-fill the email if they entered it in the modal
        }}
      />
    </div>
  );
}
