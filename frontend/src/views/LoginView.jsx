import { useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton'
import AvatarPicker, { DEFAULT_AVATARS } from '../components/AvatarPicker'
import InputField from '../components/InputField'
import { requestOtp, verifyOtp } from '../services/authService'

function LoginView({ onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState('')
  const [username, setUsername] = useState('')
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATARS[0])

  const [step, setStep] = useState('request-otp')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const actionLabel = useMemo(() => {
    if (isSubmitting) return 'Processing...'
    if (step === 'request-otp') return 'Send OTP'
    if (step === 'verify-otp') return 'Verify OTP'
    return 'Create Profile'
  }, [isSubmitting, step])

  const submitRequestOtp = async () => {
    const data = await requestOtp(email)
    setOtpId(data.otpId || '')
    setInfo(data.message || 'OTP sent. Check your inbox.')
    setStep('verify-otp')
  }

  const submitVerifyOtp = async () => {
    const data = await verifyOtp({
      email,
      otp,
      ...(step === 'complete-profile' ? { username, profileImage } : {}),
    })

    if (data.step === 'user name profile_required') {
      setStep('complete-profile')
      setInfo('You are new here. Choose a profile image and username.')
      return
    }

    if (data.success && data.user) {
      onAuthSuccess(data.user)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    if (step !== 'request-otp' && otp.trim().length !== 6) {
      setError('OTP must be 6 digits.')
      return
    }

    if (step === 'complete-profile' && username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    try {
      setIsSubmitting(true)
      if (step === 'request-otp') {
        await submitRequestOtp()
      } else {
        await submitVerifyOtp()
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center p-4 sm:p-8">
      <section className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-800">
              SyncTalk
            </p>
            <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl" style={{ fontFamily: 'Sora, sans-serif' }}>
              Secure OTP Access for your app
            </h1>
            <p className="max-w-lg text-base text-slate-600 sm:text-lg">
              Your frontend now talks directly to your backend session auth flow. Request OTP, verify, complete profile,
              and continue with a persistent session.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {['Request OTP', 'Verify OTP', 'Create Profile', 'Session Restore'].map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {step === 'request-otp' ? 'Get OTP' : step === 'verify-otp' ? 'Verify OTP' : 'Complete profile'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">Use the same email you will use in SyncTalk.</p>

            <div className="mt-5">
              <InputField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
                disabled={step !== 'request-otp'}
              />
            </div>

            {step !== 'request-otp' && (
              <div className="mt-4">
                <InputField
                  id="otp"
                  label="OTP"
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
            )}

            {step === 'complete-profile' && (
              <>
                <div className="mt-4">
                  <InputField
                    id="username"
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="mt-4">
                  <AvatarPicker selectedAvatar={profileImage} onSelect={setProfileImage} />
                </div>
              </>
            )}

            {otpId && <p className="mt-4 text-xs font-semibold text-cyan-700">OTP reference ID: {otpId}</p>}
            {info && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <div className="mt-5">
              <ActionButton type="submit" disabled={isSubmitting}>
                {actionLabel}
              </ActionButton>
            </div>

            {step !== 'request-otp' && (
              <div className="mt-3">
                <ActionButton type="button" variant="secondary" onClick={() => setStep('request-otp')}>
                  Start again
                </ActionButton>
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginView
