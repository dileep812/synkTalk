import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, getSessionStats, terminateSessions } from '../services/userService';
import { Loader2, AlertCircle, CheckCircle, Save, Smartphone, ShieldAlert, RefreshCw } from 'lucide-react';

const PROFILE_IMAGES = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Harley',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha'
];

function ProfileSettingsTab() {
  const { user, setUser, signOut } = useAuth();

  // Profile Form States
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.profileImage || PROFILE_IMAGES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Session Manager States
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [sessionSuccess, setSessionSuccess] = useState('');

  // Fetch session stats on component mount
  useEffect(() => {
    fetchSessionStats();
  }, []);

  const fetchSessionStats = async () => {
    try {
      setSessionLoading(true);
      setSessionError('');
      const data = await getSessionStats();
      if (data.success) {
        setSessionsList(data.sessions || []);
      }
    } catch (err) {
      setSessionError('Could not fetch active device sessions.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleTerminateOtherDevices = async () => {
    if (!window.confirm('Are you sure you want to log out from all other devices?')) return;
    try {
      setSessionLoading(true);
      setSessionError('');
      setSessionSuccess('');
      const data = await terminateSessions('except-me');
      if (data.success) {
        setSessionSuccess(data.message || 'Logged out other devices successfully.');
        await fetchSessionStats(); // Reload list
      }
    } catch (err) {
      setSessionError('Failed to terminate other sessions.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleTerminateAll = async () => {
    if (!window.confirm('Are you sure you want to terminate all sessions? This will log you out from this device too.')) return;
    try {
      setSessionLoading(true);
      setSessionError('');
      setSessionSuccess('');
      const data = await terminateSessions('all');
      if (data.success) {
        setSessionSuccess('Logged out of all sessions successfully.');
        await signOut();
      }
    } catch (err) {
      setSessionError('Failed to wipe all sessions.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleTerminateSpecific = async (sessionId, isCurrent) => {
    const confirmMsg = isCurrent 
      ? 'Are you sure you want to terminate your current session? You will be logged out immediately.'
      : 'Are you sure you want to terminate this active device session?';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setSessionLoading(true);
      setSessionError('');
      setSessionSuccess('');
      const data = await terminateSessions('specific', sessionId);
      if (data.success) {
        setSessionSuccess(data.message || 'Session terminated successfully.');
        if (isCurrent) {
          await signOut();
        } else {
          await fetchSessionStats(); // Reload list
        }
      }
    } catch (err) {
      setSessionError('Failed to terminate session.');
    } finally {
      setSessionLoading(false);
    }
  };

  // Helper utility to parse User Agent into Browser and OS details
  const parseUA = (ua) => {
    if (!ua || ua === 'Unknown') return { browser: 'Unknown Browser', os: 'Unknown OS' };
    
    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    return { browser, os };
  };

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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
      <main className="mx-auto w-full max-w-2xl">
        {/* Profile Settings Section */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
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

        {/* Device & Session Management Section */}
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <header className="flex items-center justify-between border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Account Security</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                Active Devices & Sessions
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and terminate active login sessions on other devices.</p>
            </div>
            <button
              type="button"
              onClick={fetchSessionStats}
              disabled={sessionLoading}
              className="p-2.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50/50 rounded-xl border border-slate-200 transition-all duration-200 disabled:opacity-50"
              title="Refresh session count"
            >
              <RefreshCw className={`h-4 w-4 ${sessionLoading ? 'animate-spin' : ''}`} />
            </button>
          </header>

          <div className="mt-6 space-y-6">
            {/* Session Error / Success alerts */}
            {sessionSuccess && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="font-medium">{sessionSuccess}</span>
              </div>
            )}
            {sessionError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span className="font-medium">{sessionError}</span>
              </div>
            )}

            {/* Active Sessions List */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Connected Devices ({sessionsList.length})
              </h3>
              
              {sessionsList.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium">No sessions found.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20">
                  {sessionsList.map((session) => {
                    const { browser, os } = parseUA(session.userAgent);
                    const formattedLogin = session.loginTime 
                      ? new Date(session.loginTime).toLocaleString() 
                      : 'N/A';
                    
                    return (
                      <div 
                        key={session.id} 
                        className="flex items-center justify-between p-4 hover:bg-slate-50/40 transition-colors duration-150"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            session.isCurrent 
                              ? 'bg-emerald-100/50 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Smartphone className="h-5 w-5" />
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800">
                                {browser} on {os}
                              </span>
                              {session.isCurrent ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/50 rounded-full">
                                  Current Device
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full">
                                  Active Session
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 text-xs text-slate-500 font-medium">
                              <p>IP Address: <span className="text-slate-700 font-semibold">{session.ip}</span></p>
                              <p>Logged In: <span className="text-slate-700 font-semibold">{formattedLogin}</span></p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTerminateSpecific(session.id, session.isCurrent)}
                          disabled={sessionLoading}
                          className="ml-4 shrink-0 px-3 py-1.5 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Session Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTerminateOtherDevices}
                disabled={sessionLoading}
                className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
              >
                Terminate Other Devices
              </button>
              <button
                type="button"
                onClick={handleTerminateAll}
                disabled={sessionLoading}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-100 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Log Out Everywhere
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProfileSettingsTab;
