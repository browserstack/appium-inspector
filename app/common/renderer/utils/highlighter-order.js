export function sortRectsForHitTesting(elements) {
  const area = ({properties}) => (properties.width || 0) * (properties.height || 0);
  return [...elements].sort((a, b) => area(b) - area(a));
}
