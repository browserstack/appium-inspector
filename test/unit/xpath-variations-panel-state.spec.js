import {describe, expect, it, vi} from 'vitest';

vi.mock('../../app/common/renderer/polyfills.js', () => ({
  getSetting: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token u in JSON')),
  setSetting: vi.fn(),
  copyToClipboard: vi.fn(),
}));

describe('XPathVariations saved panel state', () => {
  it('still loads, collapsed, when the saved state cannot be read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {default: XPathVariations} =
      await import('../../app/common/renderer/components/SessionInspector/SourceTab/SelectedElement/XPathVariations.jsx');

    expect(XPathVariations).toBeTypeOf('function');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not read the XPath variations panel state'),
    );
  });
});
