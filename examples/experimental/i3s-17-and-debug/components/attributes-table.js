import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

const TH_STYLE = {
  textAlign: 'left'
};

const DEFAULT_STYLE = {
  color: '#fff'
};

const NO_DATA = 'No Data';

const propTypes = {
  data: PropTypes.object,
  style: PropTypes.object,
  border: PropTypes.number
};

const defaultProps = {
  data: {},
  style: null,
  border: null
};

const DEFAULT_TABLE_BORDER = 0;

export default class AttributesTable extends PureComponent {
  prepareRows() {
    const {data} = this.props;
    const rows = [];

    for (const key in data) {
      const row = (
        <tr key={key}>
          <th style={TH_STYLE}>{key}</th>
          <td>{this.formatValue(data[key])}</td>
        </tr>
      );

      rows.push(row);
    }
    return rows;
  }

  formatValue(value) {
    return (
      value
        .toString()
        .replace(/[{}']+/g, '')
        .trim() || NO_DATA
    );
  }

  render() {
    const {style, border} = this.props;
    const rows = this.prepareRows();

    return rows.length ? (
      <div style={style || DEFAULT_STYLE}>
        <table border={border || DEFAULT_TABLE_BORDER} cellSpacing={0} cellPadding={3}>
          <tbody>{rows}</tbody>
        </table>
      </div>
    ) : null;
  }
}

AttributesTable.propTypes = propTypes;
AttributesTable.defaultProps = defaultProps;
