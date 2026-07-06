const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Something went wrong while contacting the server.')
  }

  return data
}

const apiRequest = async (path, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })

    return await parseResponse(response)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network request failed. Please try again.')
  }
}

const getFriends = async () => {
  return apiRequest('/users/friends', {
    method: 'GET',
  })
}

const searchUsers = async ({ page = 1, search = '' } = {}) => {
  return apiRequest('/users/search', {
    method: 'POST',
    body: JSON.stringify({ page, search }),
  })
}

const sendConnectionRequest = async (recipientId) => {
  return apiRequest('/request/send', {
    method: 'POST',
    body: JSON.stringify({ recipientId }),
  })
}

const handleConnectionRequest = async ({ requestId, action }) => {
  return apiRequest('/request/handle', {
    method: 'PATCH',
    body: JSON.stringify({ requestId, action }),
  })
}

const withdrawConnectionRequest = async (requestId) => {
  return apiRequest(`/request/withdraw/${requestId}`, {
    method: 'DELETE',
  })
}

const removeConnectionRequest=async(friendId)=>{
  return apiRequest(`/request/remove/${friendId}`, {
    method: 'DELETE',
  })
}

export {
  getFriends,
  searchUsers,
  sendConnectionRequest,
  handleConnectionRequest,
  withdrawConnectionRequest,
  removeConnectionRequest,
}
