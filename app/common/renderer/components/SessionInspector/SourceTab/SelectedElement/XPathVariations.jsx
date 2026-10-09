import {Collapse, Row, Segmented, Space, Table} from 'antd';
import {useEffect, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {getXPathVariations} from '../../../../utils/xpath-variations.js';
import inspectorStyles from '../../SessionInspector.module.css';
import styles from './SelectedElement.module.css';
import SelectedElementTableCell from './SelectedElementTableCell.jsx';
import xpathStyles from './XPathVariations.module.css';

const QUOTE_OPTIONS = [
  {label: '"double"', value: '"'},
  {label: "'single'", value: "'"},
];

const XPathVariations = ({
  sourceXML,
  selectedElement,
  xpathQuote,
  setXPathQuote,
  getSavedXPathQuote,
}) => {
  const {t} = useTranslation();

  useEffect(() => {
    getSavedXPathQuote();
  }, [getSavedXPathQuote]);

  const variations = useMemo(
    () => getXPathVariations(sourceXML, selectedElement.path, xpathQuote),
    [sourceXML, selectedElement.path, xpathQuote],
  );

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
    <Space className={inspectorStyles.spaceContainer} orientation="vertical" size="small">
      <Space className={xpathStyles.quoteRow}>
        <span>{t('XPath quotes')}</span>
        <Segmented
          id="xpathQuoteToggle"
          size="small"
          options={QUOTE_OPTIONS}
          value={xpathQuote}
          onChange={setXPathQuote}
        />
      </Space>
      {variations.length > 0 && (
        <div id="xpathVariations">
          <Collapse
            size="small"
            items={[
              {
                key: 'xpathVariations',
                label: `${t('XPath variations')} (${variations.length})`,
                children: (
                  <Row className={styles.selectedElemTableWrapper}>
                    <Table
                      showHeader={false}
                      columns={columns}
                      dataSource={variations.map((variation) => ({
                        ...variation,
                        key: variation.label,
                      }))}
                      size="small"
                      pagination={false}
                    />
                  </Row>
                ),
              },
            ]}
          />
        </div>
      )}
    </Space>
  );
};

export default XPathVariations;
