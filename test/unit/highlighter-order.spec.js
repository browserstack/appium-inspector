import {describe, expect, it} from 'vitest';

import {sortRectsForHitTesting} from '../../app/common/renderer/utils/highlighter-order.js';

const elem = (path, width, height) => ({properties: {path, width, height}});

// Returns the last element covering a point, which is what the browser hit-tests
// given absolutely positioned rects with no z-index.
const topmostOf = (elements) => elements[elements.length - 1].properties.path;

describe('sortRectsForHitTesting', () => {
  it('puts the smallest rect last so it is painted on top', () => {
    const sorted = sortRectsForHitTesting([elem('fullscreen', 402, 874), elem('back', 60, 32)]);
    expect(topmostOf(sorted)).toBe('back');
  });

  it('moves a full-screen ancestor emitted after a small element back underneath it', () => {
    // AL-15322: getElements() groups by first-seen centre point, so this order is what
    // the customer's screen actually produced — `back` before a deep full-screen wrapper.
    const emitted = [
      elem('window', 402, 874),
      elem('navbar', 402, 52),
      elem('back', 60, 32),
      elem('deep-fullscreen', 402, 872),
    ];
    expect(topmostOf(emitted)).toBe('deep-fullscreen');
    expect(topmostOf(sortRectsForHitTesting(emitted))).toBe('back');
  });

  it('leaves the caller’s array untouched, since centroids reuse it', () => {
    const emitted = [elem('back', 60, 32), elem('window', 402, 874)];
    sortRectsForHitTesting(emitted);
    expect(emitted.map((e) => e.properties.path)).toEqual(['back', 'window']);
  });

  it('tolerates the null-sized +/- centroid placeholders', () => {
    const sorted = sortRectsForHitTesting([
      {properties: {path: '201,437', width: null, height: null}},
      elem('back', 60, 32),
    ]);
    expect(sorted.map((e) => e.properties.path)).toEqual(['back', '201,437']);
  });
});
