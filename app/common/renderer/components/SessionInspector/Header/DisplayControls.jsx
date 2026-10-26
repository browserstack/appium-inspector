import {IconCarouselHorizontal} from '@tabler/icons-react';
import {Button, Select, Space, Tooltip} from 'antd';
import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {BUTTON} from '../../../constants/antd-types.js';
import {DRIVERS} from '../../../constants/common.js';

// Ant Design does not support null values in Select
const NON_NULL_DISPLAY_ID = -1;

/**
 * Button + dropdown to switch the active display, for devices that have more than one
 * (iPhone Duo being the reason this exists). Ported from appium/appium-inspector#2922
 * (the switcher) and #3242 (XCUITest support). This fork predates upstream's
 * DriverControls/ split (#3241), so the component sits next to HeaderButtons instead.
 *
 * The control renders only once the driver has actually answered mobile:listDisplays.
 * BrowserStack iOS real devices default to Appium 1.21.0, which has no equivalent for that
 * command and no legacy endpoint to branch to — so per
 * knowledge/docs/patches/appium-1x-compatibility.md we hide the control rather than ship one
 * that throws. The probe runs while AppLive still has the inspector behind its loading
 * state (InspectorTabs.jsx gates the iframe on isAppiumInspectorSessionEstablished), so on a
 * supported device the button is already present the first time the header is visible.
 */
const DisplayControls = ({
  sessionSettings,
  applyClientMethod,
  storeSessionSettings,
  getAvailableDisplays,
  automationName,
}) => {
  // UiAutomator2 and XCUITest have different default values for currentDisplayId
  const defaultDisplayId = automationName === DRIVERS.XCUITEST ? null : 0;
  const currentDisplayId = sessionSettings.currentDisplayId;

  const {t} = useTranslation();
  const multiDisplayLabel = t('toggleMultiDisplayMode');
  const [displaySelectionVisible, setDisplaySelectionVisible] = useState(false);
  const [foundDisplays, setFoundDisplays] = useState(null);

  // Probe once on mount. An empty result means either a single-display device or a driver
  // that cannot enumerate displays; both render nothing.
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const displays = await getAvailableDisplays();
      if (!cancelled) {
        setFoundDisplays(displays);
      }
    };
    probe();
    return () => {
      cancelled = true;
    };
  }, [getAvailableDisplays]);

  const getDisplayChoices = (displays) => {
    const optionsArray = displays.map(({id, name, metrics}) => {
      // XCUITest driver does not provide display names, so list dimensions instead
      const baseLabel = name ? name : `${metrics?.widthPixels}x${metrics?.heightPixels}`;
      return {
        value: id,
        label: `${baseLabel} (ID ${id})`,
      };
    });
    // The default 'null' option for XCUITest is not included in listDisplays, so explicitly add it
    if (defaultDisplayId === null) {
      optionsArray.unshift({value: NON_NULL_DISPLAY_ID, label: `${t('defaultDisplay')} (ID null)`});
    }
    return optionsArray;
  };

  // Sets currentDisplayId, if it differs from its current value.
  const setCurrentDisplay = async (displayId) => {
    const adjustedDisplayId = displayId === NON_NULL_DISPLAY_ID ? null : displayId;
    if (adjustedDisplayId !== currentDisplayId) {
      await applyClientMethod({
        methodName: 'updateSettings',
        args: [
          {
            currentDisplayId: adjustedDisplayId,
          },
        ],
      });
      // applyClientMethod does not refresh the stored settings on its own in this fork
      // (Commands.jsx does it explicitly too), so without this the dropdown would keep
      // rendering the previous value.
      storeSessionSettings({...sessionSettings, currentDisplayId: adjustedDisplayId});
    }
  };

  const toggleDisplaySelectionVisibility = async () => {
    const selectionShouldBeVisible = !displaySelectionVisible;
    setDisplaySelectionVisible(selectionShouldBeVisible);
    if (!selectionShouldBeVisible) {
      // toggling off, reset to the default display
      await setCurrentDisplay(defaultDisplayId);
    }
  };

  // Driver cannot enumerate displays (e.g. Appium 1.x), or the device has only one.
  if (!foundDisplays || foundDisplays.length === 0) {
    return null;
  }

  return (
    <Space.Compact>
      <Tooltip title={multiDisplayLabel}>
        <Button
          id="btnToggleMultiDisplay"
          aria-label={multiDisplayLabel}
          icon={<IconCarouselHorizontal size={18} />}
          type={displaySelectionVisible ? BUTTON.PRIMARY : BUTTON.DEFAULT}
          onClick={toggleDisplaySelectionVisibility}
        />
      </Tooltip>
      {displaySelectionVisible && (
        <Select
          id="selectDisplayId"
          styles={{root: {width: 200}}}
          value={currentDisplayId == null ? NON_NULL_DISPLAY_ID : currentDisplayId}
          popupMatchSelectWidth={false}
          onChange={setCurrentDisplay}
          options={getDisplayChoices(foundDisplays)}
        />
      )}
    </Space.Compact>
  );
};

export default DisplayControls;
