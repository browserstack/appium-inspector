import {select} from 'xpath';

import {childNodesOf, findDOMNodeByPath, xmlToDOM} from './source-parsing.js';

const ID_ATTRS = ['resource-id', 'name', 'id', 'accessibility-id'];
const DESCRIPTIVE_ATTRS = ['text', 'content-desc', 'label', 'value'];
const XCUITEST_SOURCE_ROOT = 'AppiumAUT';

function literal(value, quote) {
  const other = quote === "'" ? '"' : "'";
  if (!value.includes(quote)) {
    return `${quote}${value}${quote}`;
  }
  if (!value.includes(other)) {
    return `${other}${value}${other}`;
  }
  const parts = value.split(quote).map((part) => `${quote}${part}${quote}`);
  return `concat(${parts.join(`, ${other}${quote}${other}, `)})`;
}

function predicate(node, attrs, quote) {
  return `[${attrs.map((attr) => `@${attr}=${literal(node.getAttribute(attr), quote)}`).join(' and ')}]`;
}

function find(xpath, doc) {
  try {
    return select(xpath, doc);
  } catch {
    return [];
  }
}

function selectsOnly(xpath, doc, node) {
  const found = find(xpath, doc);
  return found.length === 1 && found[0] === node;
}

function indexed(xpath, doc, node) {
  const index = find(xpath, doc).indexOf(node);
  return index < 0 ? undefined : `(${xpath})[${index + 1}]`;
}

function isWholeApp(element) {
  return !element.parentNode?.tagName || element.tagName === 'XCUIElementTypeApplication';
}

function insideUniqueParent(doc, node, attrs, quote) {
  for (
    let parent = node.parentNode;
    parent?.tagName && !isWholeApp(parent);
    parent = parent.parentNode
  ) {
    const parentIdAttr = ID_ATTRS.find((attr) => parent.getAttribute(attr));
    if (!parentIdAttr) {
      continue;
    }
    const anchor = `//*${predicate(parent, [parentIdAttr], quote)}`;
    if (!selectsOnly(anchor, doc, parent)) {
      continue;
    }
    const scoped = `${anchor}//${node.tagName}`;
    const steps = [scoped, ...attrs.map((attr) => scoped + predicate(node, [attr], quote))];
    return steps.find((xpath) => selectsOnly(xpath, doc, node)) ?? indexed(scoped, doc, node);
  }
}

function fullPathSteps(node) {
  const steps = [];
  for (let current = node; current?.tagName; current = current.parentNode) {
    const sameTag = childNodesOf(current.parentNode).filter((n) => n.tagName === current.tagName);
    steps.unshift(
      sameTag.length > 1 ? `${current.tagName}[${sameTag.indexOf(current) + 1}]` : current.tagName,
    );
  }
  return steps;
}

export function getXPathVariations(sourceXML, path, quote) {
  if (!sourceXML || !path) {
    return [];
  }
  const doc = xmlToDOM(sourceXML);
  const node = findDOMNodeByPath(path, doc);
  if (!node?.tagName) {
    return [];
  }

  const tag = node.tagName;
  const idAttr = ID_ATTRS.find((attr) => node.getAttribute(attr));
  const descriptiveAttrs = DESCRIPTIVE_ATTRS.filter((attr) => node.getAttribute(attr));

  const candidates = [];
  if (idAttr) {
    candidates.push(['ID only', `//*${predicate(node, [idAttr], quote)}`]);
    candidates.push(['Type + ID', `//${tag}${predicate(node, [idAttr], quote)}`]);
  }
  for (const attr of descriptiveAttrs) {
    candidates.push([`Type + ${attr}`, `//${tag}${predicate(node, [attr], quote)}`]);
  }
  if (idAttr && descriptiveAttrs.length) {
    const [firstAttr] = descriptiveAttrs;
    candidates.push([
      `ID + ${firstAttr}`,
      `//${tag}${predicate(node, [idAttr, firstAttr], quote)}`,
    ]);
  }
  const indexAttr = idAttr ?? descriptiveAttrs[0];
  const typeXPath = `//${tag}${indexAttr ? predicate(node, [indexAttr], quote) : ''}`;
  if (!selectsOnly(typeXPath, doc, node)) {
    candidates.push(['Indexed', indexed(typeXPath, doc, node)]);
  }
  const ownAttrs = [idAttr, ...descriptiveAttrs].filter(Boolean);
  candidates.push(['Inside unique parent', insideUniqueParent(doc, node, ownAttrs, quote)]);
  const steps = fullPathSteps(node);
  const deviceSteps = steps[0] === XCUITEST_SOURCE_ROOT ? steps.slice(1) : steps;
  if (deviceSteps.length) {
    candidates.push(['Full path from root', `/${deviceSteps.join('/')}`, `/${steps.join('/')}`]);
  }

  const seen = new Set();
  const variations = [];
  for (const [label, xpath, sourceXPath = xpath] of candidates) {
    if (xpath && !seen.has(xpath) && selectsOnly(sourceXPath, doc, node)) {
      seen.add(xpath);
      variations.push({label, xpath});
    }
  }
  return variations;
}

export function withXPathQuote(xpath, quote) {
  if (quote !== "'" || !xpath) {
    return xpath;
  }
  return xpath.replace(
    /(@[^\s="'[\]]+=)"([^"]*)"/g,
    (_, attr, value) => attr + literal(value, quote),
  );
}
