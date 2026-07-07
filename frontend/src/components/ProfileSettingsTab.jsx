import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/userService';
import { Loader2, AlertCircle, CheckCircle, Save } from 'lucide-react';

const PROFILE_IMAGES = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Harley',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha'
];

function ProfileSettingsTab() {
  const { user, setUser } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.profileImage || PROFILE_IMAGES[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    if (!email.trim()) {
      setError('Email cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await updateProfile({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        profileImage: selectedAvatar
      });

      if (response.success && response.user) {
        setUser({
          ...user,
          username: response.user.username,
          email: response.user.email,
          profileImage: response.user.profileImage
        });
        setSuccess('Profile updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update profile settings.');
      }
    } catch (err) {
      setError(err.message || 'Could not update your profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <main className="mx-auto w-full max-w-2xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          {/* Header */}
          <header className="flex flex-col gap-2 border-b border-slate-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">User Profile Workspace</p>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              My Profile Settings
            </h1>
            <p className="text-sm text-slate-500 font-medium">Update your username, email, or customize your avatar character.</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Success Alert */}
            {success && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-55/80 border border-emerald-200 text-emerald-800 text-sm">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Avatar Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
                Choose Avatar
              </label>
              <div className="grid grid-cols-4 gap-4">
                {PROFILE_IMAGES.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`aspect-square rounded-2xl p-2 bg-slate-50 border transition-all duration-200 flex items-center justify-center ${
                      selectedAvatar === avatar
                        ? 'border-cyan-500 ring-4 ring-cyan-500/10 scale-105'
                        : 'border-slate-200 hover:border-slate-300 hover:scale-102'
                    }`}
                  >
                    <img src={avatar} alt="Avatar option" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {/* Username Input */}
            <div className="space-y-2">
              <label htmlFor="settings-username" className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-200"
                required
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="settings-email" className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-200"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-600/10 hover:shadow-lg active:scale-98 disabled:opacity-70 disabled:pointer-events-none transition-all duration-150"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default ProfileSettingsTab;
