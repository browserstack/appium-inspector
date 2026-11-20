import {beforeEach, describe, expect, it, vi} from 'vitest';

const ALL_PARAMS_URL =
  'http://localhost/?remoteHost=myhost&remotePort=4723&remotePath=/wd/hub&sessionId=abc123';
const MISSING_PARAM_URL = 'http://localhost/?remoteHost=myhost&remotePort=4723&remotePath=/wd/hub';
const NO_PARAMS_URL = 'http://localhost/';
const AA_DASHBOARD_URL =
  'http://localhost/?username=user1&accessKey=key1&session_id=sess123&source=aa_dashboard';
const AA_MISSING_CRED_URL = 'http://localhost/?username=user1&session_id=sess123&source=aa_dashboard';

function stubWindow(href, {embedded = true, embedderOrigin = 'https://app-automate.browserstack.com'} = {}) {
  const win = {
    location: {href, ancestorOrigins: embedded ? [embedderOrigin] : []},
    AppLiveSessionId: null,
  };
  // isAaDashboard() checks window.parent !== window and the ancestor origins
  win.parent = embedded ? {} : win;
  vi.stubGlobal('window', win);
}

describe('setting-defs.js', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  describe('#checkIfAllParamsPresent', () => {
    it('returns true and sets window.AppLiveSessionId when all 4 params are present', async () => {
      stubWindow(ALL_PARAMS_URL);
      const {checkIfAllParamsPresent} = await import('../../app/common/shared/setting-defs.js');
      expect(checkIfAllParamsPresent()).toBe(true);
      expect(window.AppLiveSessionId).toBe('abc123');
    });

    it('returns false when any one param is missing', async () => {
      stubWindow(MISSING_PARAM_URL);
      const {checkIfAllParamsPresent} = await import('../../app/common/shared/setting-defs.js');
      expect(checkIfAllParamsPresent()).toBe(false);
    });

    it('returns false and sets AppLiveSessionId to null when no params present', async () => {
      stubWindow(NO_PARAMS_URL);
      const {checkIfAllParamsPresent} = await import('../../app/common/shared/setting-defs.js');
      expect(checkIfAllParamsPresent()).toBe(false);
      expect(window.AppLiveSessionId).toBeNull();
    });
  });

  describe('#isAaDashboard', () => {
    it('is true when source=aa_dashboard and all AA credentials are present', async () => {
      stubWindow(AA_DASHBOARD_URL);
      const {isAaDashboard} = await import('../../app/common/shared/setting-defs.js');
      expect(isAaDashboard()).toBe(true);
    });

    it('is false when source=aa_dashboard but a credential is missing', async () => {
      stubWindow(AA_MISSING_CRED_URL);
      const {isAaDashboard} = await import('../../app/common/shared/setting-defs.js');
      expect(isAaDashboard()).toBe(false);
    });

    it('is false for App Live URLs (no source=aa_dashboard), so AA mode never triggers there', async () => {
      stubWindow(ALL_PARAMS_URL);
      const {isAaDashboard} = await import('../../app/common/shared/setting-defs.js');
      expect(isAaDashboard()).toBe(false);
    });

    it('is false when loaded top-level (not framed), even with all AA params — login-CSRF guard', async () => {
      stubWindow(AA_DASHBOARD_URL, {embedded: false});
      const {isAaDashboard} = await import('../../app/common/shared/setting-defs.js');
      expect(isAaDashboard()).toBe(false);
    });

    it('is false when framed by an untrusted origin (credential-injection guard)', async () => {
      stubWindow(AA_DASHBOARD_URL, {embedderOrigin: 'https://evil.example.com'});
      const {isAaDashboard} = await import('../../app/common/shared/setting-defs.js');
      expect(isAaDashboard()).toBe(false);
    });

    it('is true when embedded by a staging bsstag dashboard', async () => {
      stubWindow(AA_DASHBOARD_URL, {embedderOrigin: 'https://app-automate-k8s-devaa.bsstag.com'});
      const {isAaDashboard} = await import('../../app/common/shared/setting-defs.js');
      expect(isAaDashboard()).toBe(true);
    });

    it('exposes the snake-case session_id on window.AppLiveSessionId', async () => {
      stubWindow(AA_DASHBOARD_URL);
      // DEFAULT_SETTINGS calls checkIfAllParamsPresent() on import, which sets the global
      await import('../../app/common/shared/setting-defs.js');
      expect(window.AppLiveSessionId).toBe('sess123');
    });
  });

  describe('#isXPathToolsEnabled', () => {
    it('is true when AppLive passes xpathTools=1', async () => {
      stubWindow(`${ALL_PARAMS_URL}&xpathTools=1`);
      const {isXPathToolsEnabled} = await import('../../app/common/shared/setting-defs.js');
      expect(isXPathToolsEnabled()).toBe(true);
    });

    it('is false without the param or with any other value', async () => {
      stubWindow(ALL_PARAMS_URL);
      const {isXPathToolsEnabled} = await import('../../app/common/shared/setting-defs.js');
      expect(isXPathToolsEnabled()).toBe(false);

      vi.resetModules();
      stubWindow(`${ALL_PARAMS_URL}&xpathTools=0`);
      const reloaded = await import('../../app/common/shared/setting-defs.js');
      expect(reloaded.isXPathToolsEnabled()).toBe(false);
    });
  });

  describe('DEFAULT_SETTINGS[XPATH_VARIATIONS_EXPANDED]', () => {
    it('starts collapsed until the user expands the list', async () => {
      stubWindow(`${ALL_PARAMS_URL}&xpathTools=1`);
      const {DEFAULT_SETTINGS, XPATH_VARIATIONS_EXPANDED} =
        await import('../../app/common/shared/setting-defs.js');
      expect(DEFAULT_SETTINGS[XPATH_VARIATIONS_EXPANDED]).toBe(false);
    });
  });

  describe('DEFAULT_SETTINGS[SESSION_SERVER_PARAMS]', () => {
    it('pre-fills server params when all 4 URL params are present', async () => {
      stubWindow(ALL_PARAMS_URL);
      const {DEFAULT_SETTINGS, SESSION_SERVER_PARAMS} = await import(
        '../../app/common/shared/setting-defs.js'
      );
      expect(DEFAULT_SETTINGS[SESSION_SERVER_PARAMS]).toEqual({
        remote: {ssl: true, hostname: 'myhost', port: '4723', path: '/wd/hub'},
      });
    });

    it('is null when URL params are absent', async () => {
      stubWindow(NO_PARAMS_URL);
      const {DEFAULT_SETTINGS, SESSION_SERVER_PARAMS} = await import(
        '../../app/common/shared/setting-defs.js'
      );
      expect(DEFAULT_SETTINGS[SESSION_SERVER_PARAMS]).toBeNull();
    });
  });
});

describe('constants/common.js — AppLive event strings', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('INSTRUMENTATION_WINDOW_MESSAGE_EVENT preserves intentional "Inspecor" typo', async () => {
    const {INSTRUMENTATION_WINDOW_MESSAGE_EVENT} = await import(
      '../../app/common/renderer/constants/common.js'
    );
    // browserstack-fe listeners key on this exact string — must not be silently corrected
    expect(INSTRUMENTATION_WINDOW_MESSAGE_EVENT).toBe('InteractionWithAppiumInspecor');
  });

  it('NORMAL_WINDOW_MESSAGE_EVENT is AppLiveAppiumInspector', async () => {
    const {NORMAL_WINDOW_MESSAGE_EVENT} = await import(
      '../../app/common/renderer/constants/common.js'
    );
    expect(NORMAL_WINDOW_MESSAGE_EVENT).toBe('AppLiveAppiumInspector');
  });

  it('API_METHOD_INSTRUMENTATION_WINDOW_MESSAGE_EVENT has :apiMethod suffix', async () => {
    const {
      INSTRUMENTATION_WINDOW_MESSAGE_EVENT,
      API_METHOD_INSTRUMENTATION_WINDOW_MESSAGE_EVENT,
    } = await import('../../app/common/renderer/constants/common.js');
    expect(API_METHOD_INSTRUMENTATION_WINDOW_MESSAGE_EVENT).toBe(
      `${INSTRUMENTATION_WINDOW_MESSAGE_EVENT}:apiMethod`,
    );
  });
});
