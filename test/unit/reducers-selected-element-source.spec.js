import {beforeAll, describe, expect, it, vi} from 'vitest';

import {getXPathVariations} from '../../app/common/renderer/utils/xpath-variations.js';

let inspector;
let SELECT_ELEMENT;
let SET_SOURCE_AND_SCREENSHOT;
let UNSELECT_ELEMENT;

beforeAll(async () => {
  vi.stubGlobal('localStorage', {getItem: () => null, setItem: () => {}, removeItem: () => {}});
  ({default: inspector} = await import('../../app/common/renderer/reducers/SessionInspector.js'));
  ({SELECT_ELEMENT, SET_SOURCE_AND_SCREENSHOT, UNSELECT_ELEMENT} =
    await import('../../app/common/renderer/actions/SessionInspector.js'));
});

const LOGIN_SCREEN = `<hierarchy>
  <android.widget.FrameLayout>
    <android.widget.Button resource-id="com.app:id/login" text="Log in"/>
  </android.widget.FrameLayout>
</hierarchy>`;

const HOME_SCREEN = `<hierarchy>
  <android.widget.FrameLayout>
    <android.widget.Button resource-id="com.app:id/logout" text="Log out"/>
  </android.widget.FrameLayout>
</hierarchy>`;

const loginButton = {path: '0.0', tagName: 'android.widget.Button', attributes: {}};

describe('selectedElementSourceXML', () => {
  it('keeps the page source the element was selected on after a refresh', () => {
    const selected = inspector(undefined, {
      type: SELECT_ELEMENT,
      selectedElement: loginButton,
      sourceXML: LOGIN_SCREEN,
    });
    const refreshed = inspector(
      {...selected, sourceXML: LOGIN_SCREEN},
      {type: SET_SOURCE_AND_SCREENSHOT, sourceXML: HOME_SCREEN},
    );

    expect(refreshed.sourceXML).toBe(HOME_SCREEN);
    expect(refreshed.selectedElementSourceXML).toBe(LOGIN_SCREEN);
    expect(
      getXPathVariations(refreshed.selectedElementSourceXML, refreshed.selectedElement.path)[0]
        .xpath,
    ).toBe("//*[@resource-id='com.app:id/login']");
  });

  it('is cleared when the element is unselected', () => {
    const selected = inspector(undefined, {
      type: SELECT_ELEMENT,
      selectedElement: loginButton,
      sourceXML: LOGIN_SCREEN,
    });
    expect(inspector(selected, {type: UNSELECT_ELEMENT}).selectedElementSourceXML).toBeNull();
  });
});
