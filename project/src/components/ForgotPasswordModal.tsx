import React, { useState } from 'react';
import { Mail, Lock, KeyRound, ArrowRight, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

// Use relative path to leverage Vite proxy
const API_BASE = '';

type Step = 'email' | 'otp' | 'password' | 'success';

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onLogin }) => {
    const [step, setStep] = useState<Step>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            setStep('otp');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid OTP');
            }

            setStep('password');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    otp: otp.join(''),
                    newPassword
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setStep('success');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative z-10 w-full max-w-md overflow-hidden bg-[#0A0A0B] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
                    >
                        {/* Top glow */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

                        {/* Content Container */}
                        <div className="p-8">
                            {/* Header Icon */}
                            <div className="mx-auto w-16 h-16 bg-white/[0.03] border border-white/10 rounded-[1.25rem] flex items-center justify-center mb-6 shadow-inner">
                                {step === 'email' && <Mail className="h-7 w-7 text-cyan-400" />}
                                {step === 'otp' && <KeyRound className="h-7 w-7 text-cyan-400" />}
                                {step === 'password' && <Lock className="h-7 w-7 text-cyan-400" />}
                                {step === 'success' && <CheckCircle className="h-7 w-7 text-green-400" />}
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black font-outfit text-white tracking-wide mb-2">
                                    {step === 'email' && 'Forgot Password?'}
                                    {step === 'otp' && 'Verify Identity'}
                                    {step === 'password' && 'Reset Password'}
                                    {step === 'success' && 'Password Reset!'}
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    {step === 'email' && 'Enter your email to receive a reset code.'}
                                    {step === 'otp' && `We sent a 6-digit code to ${email}`}
                                    {step === 'password' && 'Create a strong new password.'}
                                    {step === 'success' && 'You can now log in with your new password.'}
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center font-bold flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Steps */}
                            {step === 'email' && (
                                <motion.form
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onSubmit={handleSendOTP}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        size="lg"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black font-outfit text-lg py-6 rounded-xl transition-all shadow-[0_10px_30px_rgba(6,182,212,0.2)]"
                                        type="submit"
                                    >
                                        {isLoading ? 'Sending...' : (
                                            <span className="flex items-center gap-2">
                                                Send Code <ArrowRight className="h-4 w-4" />
                                            </span>
                                        )}
                                    </Button>
                                </motion.form>
                            )}

                            {step === 'otp' && (
                                <motion.form
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onSubmit={handleVerifyOTP}
                                    className="space-y-6"
                                >
                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                className="w-12 h-14 bg-white/[0.03] border border-white/10 rounded-xl text-center text-2xl font-bold text-white outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                            />
                                        ))}
                                    </div>
                                    <Button
                                        size="lg"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black font-outfit text-lg py-6 rounded-xl transition-all shadow-[0_10px_30px_rgba(6,182,212,0.2)]"
                                        type="submit"
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                                    </Button>
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => setStep('email')}
                                            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors flex items-center justify-center mx-auto gap-2"
                                        >
                                            <ArrowLeft className="h-3 w-3" />
                                            Wrong email?
                                        </button>
                                    </div>
                                </motion.form>
                            )}

                            {step === 'password' && (
                                <motion.form
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onSubmit={handleResetPassword}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                            <input
                                                type="password"
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                                placeholder="New password"
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-medium placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                                placeholder="Confirm new password"
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        size="lg"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black font-outfit text-lg py-6 rounded-xl transition-all shadow-[0_10px_30px_rgba(6,182,212,0.2)]"
                                        type="submit"
                                    >
                                        {isLoading ? 'Updating...' : 'Reset Password'}
                                    </Button>
                                </motion.form>
                            )}

                            {step === 'success' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center space-y-6"
                                >
                                    <p className="text-gray-300 font-medium">
                                        Your password has been successfully reset. You can now log in with your new credentials.
                                    </p>
                                    <Button
                                        onClick={() => {
                                            onLogin();
                                            // Close handled by parent (Login) when state changes? 
                                            // But standard prop is onClose. 
                                            // Actually onLogin in Login.tsx just calls setShowForgotPassword(false)
                                            // onLogin(); 
                                            // onClose(); // Both are passed, let's keep logic
                                        }}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black font-outfit text-lg py-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(34,197,94,0.2)]"
                                    >
                                        Back to Login
                                    </Button>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Close Button */}
                        {step !== 'success' && (
                            <div className="bg-white/[0.02] border-t border-white/5 py-4 text-center">
                                <button
                                    onClick={onClose}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ForgotPasswordModal;
