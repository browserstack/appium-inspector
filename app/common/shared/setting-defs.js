// Definitions for all the persistent settings used in the app

import {fallbackLng} from './i18next.config.js';

export const PREFERRED_LANGUAGE = 'PREFERRED_LANGUAGE';
export const PREFERRED_THEME = 'PREFERRED_THEME';
export const SAVED_SESSIONS = 'SAVED_SESSIONS';
export const SET_SAVED_GESTURES = 'SET_SAVED_GESTURES';
export const SERVER_ARGS = 'SERVER_ARGS';
export const SESSION_SERVER_PARAMS = 'SESSION_SERVER_PARAMS';
export const SESSION_SERVER_TYPE = 'SESSION_SERVER_TYPE';
export const SAVED_CLIENT_FRAMEWORK = 'SAVED_FRAMEWORK';
export const VISIBLE_PROVIDERS = 'VISIBLE_PROVIDERS';
export const XPATH_VARIATIONS_EXPANDED = 'XPATH_VARIATIONS_EXPANDED';

export const REQUIRED_PARAMS_FOR_PREFILLING = ['remoteHost', 'remotePort', 'remotePath', 'sessionId'];

// App Automate (source=aa_dashboard) embeds the Inspector with the BrowserStack credentials
// and the running session id passed directly in the iframe URL (session_id, snake_case).
export const AA_DASHBOARD_REQUIRED_PARAMS = ['username', 'accessKey', 'session_id'];

const _url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost/');

// Returns true when all 4 AppLive URL params are present.
// Also stores the embedded session id on window.AppLiveSessionId for use by auto-attach logic.
// AppLive passes it as `sessionId`; App Automate passes it as `session_id` (snake_case).
export const checkIfAllParamsPresent = () => {
  const allPresent = REQUIRED_PARAMS_FOR_PREFILLING.every((p) => !!_url.searchParams.get(p));
  if (typeof window !== 'undefined') {
    window.AppLiveSessionId =
      _url.searchParams.get('sessionId') || _url.searchParams.get('session_id') || null;
  }
  return allPresent;
};

// An origin is a trusted App Automate dashboard if it is the prod host or a staging bsstag host.
const originIsAaDashboard = (origin) => {
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  return (
    host === 'app-automate.browserstack.com' || // prod
    /^(app-)?automate-[a-z0-9-]+\.bsstag\.com$/.test(host) // staging, e.g. app-automate-k8s-devaa.bsstag.com
  );
};

// The Inspector may only enter AA mode when it is framed AND every ancestor frame is a trusted
// App Automate dashboard origin. Being framed alone is not proof — an attacker could embed the
// real Inspector URL with crafted URL credentials (login-CSRF / credential injection). We verify
// the embedder via location.ancestorOrigins (reliable on Chromium/WebKit, not strippable), falling
// back to the document.referrer origin where ancestorOrigins is unavailable (e.g. Firefox).
// NOTE: the stronger fix is to stop passing credentials in the URL and have the verified parent
// send them via an origin-checked postMessage — tracked as a follow-up (remove accessKey from URL).
const isEmbeddedByAaDashboard = () => {
  if (typeof window === 'undefined' || window.parent === window) {
    return false;
  }
  try {
    const ancestors = window.location.ancestorOrigins;
    if (ancestors && ancestors.length) {
      return Array.from(ancestors).every(originIsAaDashboard);
    }
  } catch {
    // ancestorOrigins unsupported — fall through to the referrer origin
  }
  try {
    return !!document.referrer && originIsAaDashboard(new URL(document.referrer).origin);
  } catch {
    return false;
  }
};

// True only when the Inspector is embedded by a trusted App Automate dashboard. Every AA-specific
// patch is gated on this so App Live's own behaviour is never affected.
export const isAaDashboard = () =>
  isEmbeddedByAaDashboard() &&
  _url.searchParams.get('source') === 'aa_dashboard' &&
  AA_DASHBOARD_REQUIRED_PARAMS.every((p) => !!_url.searchParams.get(p));

export const isXPathToolsEnabled = () => _url.searchParams.get('xpathTools') === '1';

export const DEFAULT_SETTINGS = {
  [PREFERRED_LANGUAGE]: fallbackLng,
  [PREFERRED_THEME]: 'system',
  [SAVED_SESSIONS]: [],
  [SET_SAVED_GESTURES]: [],
  [SERVER_ARGS]: null,
  [SESSION_SERVER_PARAMS]: checkIfAllParamsPresent()
    ? {
        remote: {
          ssl: true,
          hostname: _url.searchParams.get('remoteHost'),
          port: _url.searchParams.get('remotePort'),
          path: _url.searchParams.get('remotePath'),
        },
      }
    : null,
  [SESSION_SERVER_TYPE]: null,
  [SAVED_CLIENT_FRAMEWORK]: 'java',
  [VISIBLE_PROVIDERS]: null,
  [XPATH_VARIATIONS_EXPANDED]: false,
};

// When running inside AppLive (URL params present), overwrite any stale localStorage
// SESSION_SERVER_PARAMS so getSetting() always uses the current session's credentials.
if (typeof window !== 'undefined' && DEFAULT_SETTINGS[SESSION_SERVER_PARAMS] !== null) {
  try {
    localStorage.setItem(SESSION_SERVER_PARAMS, JSON.stringify(DEFAULT_SETTINGS[SESSION_SERVER_PARAMS]));
  } catch (e) {
    // localStorage unavailable (e.g. Safari private browsing) — continue with in-memory default
  }
}
