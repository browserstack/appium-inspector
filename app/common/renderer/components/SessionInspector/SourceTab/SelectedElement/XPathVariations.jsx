import {Collapse, Row, Table} from 'antd';
import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {XPATH_VARIATIONS_EXPANDED} from '../../../../../shared/setting-defs.js';
import {getSetting, setSetting} from '../../../../polyfills.js';
import {log} from '../../../../utils/logger.js';
import {getXPathVariations} from '../../../../utils/xpath-variations.js';
import styles from './SelectedElement.module.css';
import SelectedElementTableCell from './SelectedElementTableCell.jsx';
import xpathStyles from './XPathVariations.module.css';

const PANEL_KEY = 'xpathVariations';
let isExpandedSaved = Boolean(await getSetting(XPATH_VARIATIONS_EXPANDED));

const XPathVariations = ({sourceXML, selectedElement}) => {
  const {t} = useTranslation();
  const [isExpanded, setIsExpanded] = useState(isExpandedSaved);

  const handleExpandChange = async (keys) => {
    isExpandedSaved = [].concat(keys).includes(PANEL_KEY);
    setIsExpanded(isExpandedSaved);
    try {
      await setSetting(XPATH_VARIATIONS_EXPANDED, isExpandedSaved);
    } catch (err) {
      log.warn(`Could not save the XPath variations panel state: ${err}`);
    }
  };

  const variations = useMemo(
    () => getXPathVariations(sourceXML, selectedElement.path),
    [sourceXML, selectedElement.path],
  );

  if (!variations.length) {
    return null;
  }

  const columns = [
    {
      dataIndex: 'xpath',
      key: 'xpath',
      render: (xpath, {label}) => (
        <>
          <div className={xpathStyles.variationLabel}>{label}</div>
          <SelectedElementTableCell text={xpath} isCopyable={true} />
        </>
      ),
    },
  ];

  return (
    <div id="xpathVariations">
      <Collapse
        size="small"
        activeKey={isExpanded ? [PANEL_KEY] : []}
        onChange={handleExpandChange}
        items={[
          {
            key: PANEL_KEY,
            label: `${t('XPath variations')} (${variations.length})`,
            children: (
              <Row className={styles.selectedElemTableWrapper}>
                <Table
                  showHeader={false}
                  columns={columns}
                  dataSource={variations.map((variation) => ({...variation, key: variation.label}))}
                  size="small"
                  pagination={false}
                />
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default XPathVariations;
