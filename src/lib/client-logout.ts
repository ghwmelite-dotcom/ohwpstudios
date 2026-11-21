/** Revoke the bearer credential before clearing this browser's session. */
export async function logoutClient() {
  try {
    const token = localStorage.getItem('client_token');
    if (token) {
      const response = await fetch('/api/client/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Logout failed');
    }
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_user');
    window.location.href = '/client/login';
  } catch {
    window.alert('We couldn’t sign you out securely. Check your connection and try again.');
  }
}
