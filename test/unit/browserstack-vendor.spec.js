import {describe, expect, it} from 'vitest';

import {getBstackHubUrl} from '../../app/common/renderer/lib/vendor/bstack-hub.js';

describe('browserstack vendor — getBstackHubUrl (AA dashboard hub mapping)', () => {
  it('maps the production dashboard origin to hub-cloud', () => {
    expect(getBstackHubUrl('https://app-automate.browserstack.com/appium-inspector/?source=aa_dashboard')).toBe(
      'hub-cloud.browserstack.com',
    );
  });

  it('maps a staging origin to the matching bsstag hub, stripping app-automate-', () => {
    expect(getBstackHubUrl('https://app-automate-k8s-devaa.bsstag.com/appium-inspector/')).toBe(
      'hub-k8s-devaa.bsstag.com',
    );
  });

  it('also strips the automate- prefix for staging origins', () => {
    expect(getBstackHubUrl('https://automate-k8s.bsstag.com/appium-inspector/')).toBe(
      'hub-k8s.bsstag.com',
    );
  });

  it('falls back to hub-cloud for anything else', () => {
    expect(getBstackHubUrl('http://localhost/')).toBe('hub-cloud.browserstack.com');
  });
});
