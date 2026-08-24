const AUTH_COOKIE_NAME = 'papelaria_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function parseCookies(header = '') {
  return String(header)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return cookies;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
      return cookies;
    }, {});
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: SESSION_MAX_AGE_MS
  };
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
}

function clearAuthCookie(res) {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
}

function getCookieToken(req) {
  return parseCookies(req.headers.cookie)[AUTH_COOKIE_NAME] || '';
}

module.exports = {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  setAuthCookie,
  clearAuthCookie,
  getCookieToken
};
