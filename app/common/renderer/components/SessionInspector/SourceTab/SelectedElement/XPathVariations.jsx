import {Collapse, Row, Table} from 'antd';
import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {getXPathVariations} from '../../../../utils/xpath-variations.js';
import styles from './SelectedElement.module.css';
import SelectedElementTableCell from './SelectedElementTableCell.jsx';
import xpathStyles from './XPathVariations.module.css';

const XPathVariations = ({sourceXML, selectedElement}) => {
  const {t} = useTranslation();

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
        items={[
          {
            key: 'xpathVariations',
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
