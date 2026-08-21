import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock, ScanLine, Boxes, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { extractErrorMessage } from '../services/api';
import doodledryLogo from '../assets/doodledry-logo.png';

const FEATURES = [
  { icon: ScanLine, text: 'Scan & sell straight from your phone camera' },
  { icon: Boxes, text: 'Live stock across every age, design & color' },
  { icon: ShieldCheck, text: 'Role-based access with a full audit trail' },
];

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm();

  if (!loading && user) {
    const redirectTo = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-brand-800 px-12 py-12 text-brand-50 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <img src={doodledryLogo} alt="doodledry" className="h-14 w-auto rounded-xl shadow-glow" />
        </div>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Inventory, sorted — down to the last color.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-200">
            One system for age groups, designs, product types, and colors — with barcode scanning built
            in for the shop floor.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-300 ring-1 ring-inset ring-white/10">
                  <Icon size={16} />
                </span>
                <span className="text-sm text-brand-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-300">© {new Date().getFullYear()} doodledry. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <img src={doodledryLogo} alt="doodledry" className="mb-4 h-14 w-auto rounded-xl shadow-soft" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-gray-500">Sign in to your inventory dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="username"
                  {...register('email', { required: 'Email is required.' })}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required.' })}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full !bg-brand-700 !py-2.5 shadow-glow hover:!bg-brand-800"
              loading={submitting}
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Access is managed by your Super Admin. Contact them if you need an account or a password reset.
          </p>
        </div>
      </div>
    </div>
  );
}
