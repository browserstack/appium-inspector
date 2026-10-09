import {describe, expect, it} from 'vitest';
import {select} from 'xpath';

import {xmlToDOM} from '../../app/common/renderer/utils/source-parsing.js';
import {
  getXPathVariations,
  withXPathQuote,
} from '../../app/common/renderer/utils/xpath-variations.js';

const ANDROID_SOURCE = `<hierarchy>
  <android.widget.FrameLayout>
    <android.widget.LinearLayout resource-id="com.barclays:id/login_form">
      <android.widget.EditText resource-id="com.barclays:id/username" text="Username"/>
      <android.widget.Button resource-id="com.barclays:id/btn_login" text="Log in" content-desc="Log in button"/>
      <android.widget.TextView text="Don't have an account?"/>
      <android.widget.TextView text='Say "hi" to O&apos;Neil'/>
    </android.widget.LinearLayout>
    <android.widget.ListView resource-id="com.barclays:id/accounts">
      <android.widget.TextView resource-id="com.barclays:id/account_name" text="Current"/>
      <android.widget.TextView resource-id="com.barclays:id/account_name" text="Savings"/>
    </android.widget.ListView>
    <android.widget.LinearLayout resource-id="com.barclays:id/bottom_nav">
      <android.widget.ImageView resource-id="com.barclays:id/icon"/>
      <android.widget.ImageView resource-id="com.barclays:id/icon"/>
    </android.widget.LinearLayout>
  </android.widget.FrameLayout>
</hierarchy>`;

const IOS_SOURCE = `<AppiumAUT>
  <XCUIElementTypeApplication name="Barclays" label="Barclays">
    <XCUIElementTypeWindow>
      <XCUIElementTypeOther name="loginForm">
        <XCUIElementTypeButton type="XCUIElementTypeButton" name="loginButton" label="Log in"/>
        <XCUIElementTypeStaticText type="XCUIElementTypeStaticText" value="Welcome"/>
      </XCUIElementTypeOther>
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="help" label="Help"/>
    </XCUIElementTypeWindow>
  </XCUIElementTypeApplication>
</AppiumAUT>`;

const byLabel = (variations) => Object.fromEntries(variations.map((v) => [v.label, v.xpath]));

function allPaths(node, prefix = '') {
  const children = Array.from(node.childNodes).filter((n) => n.nodeType === 1);
  return children.flatMap((child, i) => {
    const path = prefix ? `${prefix}.${i}` : `${i}`;
    return [path, ...allPaths(child, path)];
  });
}

describe('getXPathVariations', () => {
  it('offers ID, type, attribute, parent-scoped and full-path variations for an Android button', () => {
    expect(byLabel(getXPathVariations(ANDROID_SOURCE, '0.0.1', "'"))).toEqual({
      'ID only': "//*[@resource-id='com.barclays:id/btn_login']",
      'Type + ID': "//android.widget.Button[@resource-id='com.barclays:id/btn_login']",
      'Type + text': "//android.widget.Button[@text='Log in']",
      'Type + content-desc': "//android.widget.Button[@content-desc='Log in button']",
      'ID + text':
        "//android.widget.Button[@resource-id='com.barclays:id/btn_login' and @text='Log in']",
      'Inside unique parent':
        "//*[@resource-id='com.barclays:id/login_form']//android.widget.Button",
      'Full path from root':
        '/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout[1]/android.widget.Button',
    });
  });

  it('uses double quotes when that is the preference', () => {
    expect(byLabel(getXPathVariations(ANDROID_SOURCE, '0.0.1', '"'))['ID only']).toBe(
      '//*[@resource-id="com.barclays:id/btn_login"]',
    );
  });

  it('drops variations that match more than one element', () => {
    const savings = byLabel(getXPathVariations(ANDROID_SOURCE, '0.1.1', "'"));
    expect(savings['ID only']).toBeUndefined();
    expect(savings['Type + ID']).toBeUndefined();
    expect(savings['Type + text']).toBe("//android.widget.TextView[@text='Savings']");
    expect(savings.Indexed).toBe(
      "(//android.widget.TextView[@resource-id='com.barclays:id/account_name'])[2]",
    );
    expect(savings['Inside unique parent']).toBe(
      "//*[@resource-id='com.barclays:id/accounts']//android.widget.TextView[@text='Savings']",
    );
    expect(savings['Full path from root']).toBe(
      '/hierarchy/android.widget.FrameLayout/android.widget.ListView/android.widget.TextView[2]',
    );
  });

  it('falls back to indexed variations when no attribute is unique', () => {
    expect(byLabel(getXPathVariations(ANDROID_SOURCE, '0.2.0', "'"))).toEqual({
      Indexed: "(//android.widget.ImageView[@resource-id='com.barclays:id/icon'])[1]",
      'Inside unique parent':
        "(//*[@resource-id='com.barclays:id/bottom_nav']//android.widget.ImageView)[1]",
      'Full path from root':
        '/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout[2]/android.widget.ImageView[1]',
    });
  });

  it('keeps double quotes for a value that contains an apostrophe', () => {
    expect(byLabel(getXPathVariations(ANDROID_SOURCE, '0.0.2', "'"))['Type + text']).toBe(
      `//android.widget.TextView[@text="Don't have an account?"]`,
    );
  });

  it('uses the iOS name attribute as the ID', () => {
    const button = byLabel(getXPathVariations(IOS_SOURCE, '0.0.0.0', "'"));
    expect(button['ID only']).toBe("//*[@name='loginButton']");
    expect(button['Type + label']).toBe("//XCUIElementTypeButton[@label='Log in']");
    expect(button['Inside unique parent']).toBe("//*[@name='loginForm']//XCUIElementTypeButton");
    expect(button['Full path from root']).toBe(
      '/XCUIElementTypeApplication/XCUIElementTypeWindow/XCUIElementTypeOther/XCUIElementTypeButton',
    );
  });

  it('does not offer the whole iOS app as the unique parent', () => {
    const help = byLabel(getXPathVariations(IOS_SOURCE, '0.0.1', "'"));
    expect(help['ID only']).toBe("//*[@name='help']");
    expect(help['Inside unique parent']).toBeUndefined();
  });

  it.each([
    ['Android', ANDROID_SOURCE],
    ['iOS', IOS_SOURCE],
  ])('every %s variation selects exactly the chosen element, with no duplicates', (_, source) => {
    const doc = xmlToDOM(source);
    const root = Array.from(doc.childNodes).find((n) => n.nodeType === 1);
    const asDeviceEvaluates = (xpath) =>
      root.tagName === 'AppiumAUT' && /^\/[^/]/.test(xpath) ? `/AppiumAUT${xpath}` : xpath;
    for (const quote of ["'", '"']) {
      for (const path of allPaths(root)) {
        const target = path
          .split('.')
          .reduce(
            (node, i) => Array.from(node.childNodes).filter((n) => n.nodeType === 1)[i],
            root,
          );
        const xpaths = getXPathVariations(source, path, quote).map((v) => v.xpath);
        expect(new Set(xpaths).size).toBe(xpaths.length);
        for (const xpath of xpaths) {
          expect(select(asDeviceEvaluates(xpath), doc), `${path}: ${xpath}`).toEqual([target]);
        }
      }
    }
  });

  it('returns nothing when the path does not resolve', () => {
    expect(getXPathVariations(ANDROID_SOURCE, '9.9', "'")).toEqual([]);
    expect(getXPathVariations('', '0', "'")).toEqual([]);
  });
});

describe('withXPathQuote', () => {
  it('switches every attribute value to single quotes', () => {
    expect(
      withXPathQuote('//android.widget.Button[@resource-id="a:id/b" and @text="Log in"]', "'"),
    ).toBe("//android.widget.Button[@resource-id='a:id/b' and @text='Log in']");
  });

  it('switches indexed xpaths too', () => {
    expect(withXPathQuote('(//android.widget.TextView[@text="Savings"])[2]', "'")).toBe(
      "(//android.widget.TextView[@text='Savings'])[2]",
    );
  });

  it('leaves a value containing an apostrophe in double quotes', () => {
    expect(withXPathQuote(`//*[@text="Don't" and @name="x"]`, "'")).toBe(
      `//*[@text="Don't" and @name='x']`,
    );
  });

  it('is a no-op for the double-quote preference and for paths without attributes', () => {
    const xpath = '//*[@text="Log in"]';
    expect(withXPathQuote(xpath, '"')).toBe(xpath);
    expect(withXPathQuote('/hierarchy/android.widget.Button[2]', "'")).toBe(
      '/hierarchy/android.widget.Button[2]',
    );
  });
});
