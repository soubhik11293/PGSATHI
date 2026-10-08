import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { GraduationCap, Utensils, Wrench, Shield, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { allDemoUsers, switchUser, showToast } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'student' | 'homemaker' | 'provider'>('student');
  const [pgName, setPgName] = useState('');
  const [area, setArea] = useState('Koramangala');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          name,
          email,
          phone,
          role,
          pgName: role === 'student' ? pgName : undefined,
          area
        });
        if (res.success && res.user) {
          switchUser(res.user);
          showToast(`Welcome to PG Saathi, ${res.user.name}!`, 'success');
          if (onComplete) onComplete();
        } else {
          showToast('Registration failed', 'error');
        }
      } else {
        const res = await api.login({ email });
        if (res.success && res.user) {
          switchUser(res.user);
          showToast(`Welcome back, ${res.user.name}!`, 'success');
          if (onComplete) onComplete();
        } else {
          showToast('Login failed', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Authentication error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xl space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
          PG
        </div>
        <h2 className="text-2xl font-black text-zinc-900 mt-3">
          {isRegister ? 'Join PG Saathi' : 'Sign in to PG Saathi'}
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Everything your PG life needs, in one place.
        </p>
      </div>

      {/* 1-Click Demo Accounts for Fast Evaluation */}
      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
        <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
          Instant 1-Click Demo Login
        </span>
        <div className="grid grid-cols-2 gap-2">
          {allDemoUsers.map(user => (
            <button
              key={user.id}
              onClick={() => {
                switchUser(user);
                if (onComplete) onComplete();
              }}
              className="p-2 rounded-xl bg-white border border-zinc-200 hover:border-amber-400 text-left text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
              <div className="truncate">
                <div className="font-bold text-zinc-800 truncate">{user.name.split(' ')[0]}</div>
                <div className="text-[10px] text-zinc-400 capitalize">{user.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-zinc-200"></div>
        <span className="flex-shrink mx-3 text-xs text-zinc-400">or enter details</span>
        <div className="flex-grow border-t border-zinc-200"></div>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {isRegister && (
          <>
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Patel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1.5">What are you joining as?</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    role === 'student' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold' : 'border-zinc-200 text-zinc-600'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('homemaker')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    role === 'homemaker' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-zinc-200 text-zinc-600'
                  }`}
                >
                  <Utensils className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <span>Homemaker</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('provider')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    role === 'provider' ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold' : 'border-zinc-200 text-zinc-600'
                  }`}
                >
                  <Wrench className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  <span>Technician</span>
                </button>
              </div>
            </div>

            {role === 'student' && (
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">PG / Hostel Name</label>
                <input
                  type="text"
                  value={pgName}
                  onChange={(e) => setPgName(e.target.value)}
                  placeholder="e.g. Stanza Living Poznan House"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Area / Zone</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs"
              >
                <option value="Koramangala">Koramangala, Bengaluru</option>
                <option value="HSR Layout">HSR Layout, Bengaluru</option>
                <option value="Indiranagar">Indiranagar, Bengaluru</option>
                <option value="BTM Layout">BTM Layout, Bengaluru</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-bold text-zinc-700 block mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@pgsaathi.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-700 block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <span>{isRegister ? 'Complete Registration' : 'Log In'}</span>
          )}
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>
      </form>
    </div>
  );
};
