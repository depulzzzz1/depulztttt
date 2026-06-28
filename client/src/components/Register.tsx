import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '../schemas/authSchema';
import { Eye, EyeOff, Lock, User, Shield, UserPlus, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegisterProps {
  onSuccess?: (user: { id: number; username: string; role: string }) => void;
  onNavigateToLogin?: () => void;
  apiUrl?: string;
}

export const Register: React.FC<RegisterProps> = ({
  onSuccess,
  onNavigateToLogin,
  apiUrl = 'http://localhost:5000/api/auth/register'
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      role: 'Admin',
    }
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Exclude confirmPassword from the actual payload submitted to backend
      const { confirmPassword, ...payload } = data;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'Registration failed. Please check registration rules.');
      }

      setSuccessMessage('Registration successful! Redirecting to login...');
      reset();

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(resData.user);
        }, 1200);
      } else if (onNavigateToLogin) {
        setTimeout(() => {
          onNavigateToLogin();
        }, 1200);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090D16] p-4 font-sans selection:bg-[#10B981]/30 selection:text-[#10B981]">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Register Card */}
      <div className="relative w-full max-w-md bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 overflow-hidden">
        {/* Top Border Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500" />

        {/* Back Link */}
        {onNavigateToLogin && (
          <button
            onClick={onNavigateToLogin}
            disabled={isLoading}
            className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Login</span>
          </button>
        )}

        {/* Header Section */}
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl shadow-lg shadow-teal-500/20 mb-4 text-[#090D16]">
            <UserPlus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-sans">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Register as a new panel Owner or Administrator</p>
        </div>

        {/* Global Feedback Messages */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-900/50 rounded-xl p-4 text-red-200 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 flex items-start gap-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-4 text-emerald-200 text-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username Input Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                {...register('username')}
                type="text"
                placeholder="Choose username"
                disabled={isLoading}
                className={`w-full bg-[#090D16]/90 border ${
                  errors.username ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
                } rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-250 focus:ring-4`}
              />
            </div>
            {errors.username && (
              <p className="text-red-400 text-xs mt-1 pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" />
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Role Choice Input Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Role Type</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Shield className="w-5 h-5" />
              </div>
              <select
                {...register('role')}
                disabled={isLoading}
                className={`w-full bg-[#090D16]/90 border ${
                  errors.role ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
                } rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all duration-250 focus:ring-4 appearance-none cursor-pointer`}
              >
                <option value="Admin" className="bg-[#0F172A] text-white">Administrator (Standard operations)</option>
                <option value="Owner" className="bg-[#0F172A] text-white">System Owner (Full permissions)</option>
              </select>
              {/* Custom Chevron indicator */}
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            {errors.role && (
              <p className="text-red-400 text-xs mt-1 pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" />
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Password Input Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 4 characters"
                disabled={isLoading}
                className={`w-full bg-[#090D16]/90 border ${
                  errors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
                } rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-500 outline-none transition-all duration-250 focus:ring-4`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1 pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Input Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm choose password"
                disabled={isLoading}
                className={`w-full bg-[#090D16]/90 border ${
                  errors.confirmPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
                } rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-500 outline-none transition-all duration-250 focus:ring-4`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative group bg-gradient-to-r from-teal-500 to-emerald-500 text-[#090D16] hover:brightness-110 active:scale-[0.98] transition-all duration-200 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Register Account</span>
                <UserPlus className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        {onNavigateToLogin && (
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <button
                onClick={onNavigateToLogin}
                className="text-teal-400 hover:text-teal-300 font-semibold transition-colors focus:outline-none"
              >
                Sign In Instead
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
