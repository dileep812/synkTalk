const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AUTH_BASE_PATH = import.meta.env.VITE_AUTH_BASE_PATH || '/auth'

const buildUrl = (path) => `${API_BASE_URL}${AUTH_BASE_PATH}${path}`

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed. Please try again.')
  }
  return data
}

const request = async (path, options = {}) => {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  return parseResponse(response)
}

const requestOtp = async (email) => {
  return request('/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

const verifyOtp = async ({ email, otp, username, profileImage }) => {
  const payload = {
    email,
    otp,
  }

  if (username) payload.username = username
  if (profileImage) payload.profileImage = profileImage

  return request('/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

const logout = async () => {
  return request('/logout', {
    method: 'POST',
  })
}

const getSessionUser = async () => {
  return request('/me', {
    method: 'GET',
  })
}

export { requestOtp, verifyOtp, logout, getSessionUser }
