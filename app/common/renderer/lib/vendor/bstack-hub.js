export const DEFAULT_BROWSERSTACK_HOST = 'hub-cloud.browserstack.com';

/**
 * Map the Inspector's own location to the matching BrowserStack hub. In App Automate dashboard
 * mode the Inspector is served from the same environment as the session, so the hub is derived
 * from window.location: prod (…browserstack.com) → hub-cloud; staging
 * (app-automate-<env>.bsstag.com) → hub-<env>.bsstag.com. Ported from the AA Inspector fork.
 */
export function getBstackHubUrl(url) {
  if (url.includes('browserstack')) {
    return DEFAULT_BROWSERSTACK_HOST;
  } else if (url.includes('bsstag')) {
    const subdomain = new URL(url).hostname.split('.')[0];
    const modifiedSubdomain = subdomain.replace(/^app-automate-|^automate-/, '');
    return `hub-${modifiedSubdomain}.bsstag.com`;
  }
  return DEFAULT_BROWSERSTACK_HOST;
}
