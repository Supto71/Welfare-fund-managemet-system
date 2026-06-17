// Central API helper — reads token from localStorage and proxies to Express backend
const BASE = '/api'

function getToken() {
  return localStorage.getItem('token') || ''
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const api = {
  // Auth
  register:        (body)       => request('/auth/register',{ method: 'POST', body: JSON.stringify(body) }),
  login:           (body)       => request('/auth/login',   { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword:  (body)       => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword:   (body)       => request('/auth/reset-password',  { method: 'POST', body: JSON.stringify(body) }),
  getSummary:      (month)      => request('/dashboard/summary' + (month && month !== 'all' ? `?month=${month}` : '')),
  getMemberHistory:(id)         => request(`/dashboard/member/${id}/history`),
  addTransaction:  (body)       => request('/admin/add-transaction', { method: 'POST', body: JSON.stringify(body) }),
  resetTransaction:(body)       => request('/admin/set-transaction', { method: 'PUT', body: JSON.stringify(body) }),
  updateWelfare:   (body)       => request('/admin/update-welfare', { method: 'PUT', body: JSON.stringify(body) }),
  
  getWelfareTransactions: ()       => request('/welfare/transactions'),
  addWelfareTransaction: (body)    => request('/admin/welfare-transaction', { method: 'POST', body: JSON.stringify(body) }),
  deleteWelfareTransaction: (id)   => request(`/admin/welfare-transaction/${id}`, { method: 'DELETE' }),
  updateMemberSettings: (body)     => request('/admin/update-member', { method: 'PUT', body: JSON.stringify(body) }),
  
  // User Profile
  updateMyName:    (body)       => request('/users/me/name', { method: 'PUT', body: JSON.stringify(body) }),
  getMemberNames:  ()           => request('/users/names')
}
