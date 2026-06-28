import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '../schemas/authSchema';
import { Eye, EyeOff, Lock, User, Shield, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onSuccess?: (token: string, user: { id: number; username: string; role: string }) => void;
  onNavigateToRegister?: () => void;
  apiUrl?: string;
}

export const Login: React.FC<LoginProps> = ({
  onSuccess,
  onNavigateToRegister,
  apiUrl = 'http://localhost:5000/api/auth/login'
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    }
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'Login failed. Please check your credentials.');
      }

      setSuccessMessage('Login successful! Redirecting...');
      
      // Store token and user details in localStorage
      localStorage.setItem('token', resData.token);
      localStorage.setItem('user', JSON.stringify(resData.user));

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(resData.token, resData.user);
        }, 1000);
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
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 overflow-hidden">
        {/* Top Border Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg shadow-emerald-500/20 mb-4 text-[#090D16]">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">DEPMQ WA PANEL</h2>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage your premium WhatsApp bot</p>
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

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                placeholder="Enter username"
                disabled={isLoading}
                className={`w-full bg-[#090D16]/90 border ${
                  errors.username ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
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

          {/* Password Input Group */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Password</label>
              <a href="#" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full bg-[#090D16]/90 border ${
                  errors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative group bg-gradient-to-r from-emerald-500 to-teal-500 text-[#090D16] hover:brightness-110 active:scale-[0.98] transition-all duration-200 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        {onNavigateToRegister && (
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-sm text-slate-400">
              New owner or administrator?{' '}
              <button
                onClick={onNavigateToRegister}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors focus:outline-none"
              >
                Register an Account
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
