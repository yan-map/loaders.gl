import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import AttributesTable from './attributes-table';
import {getShortTileDebugInfo} from '../tile-debug';

const TilesContainer = styled.div`
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
`;
const TileItem = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-flow: column nowrap;
`;

const TileControl = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 10px;
`;

const Tile = styled.div`
  min-width: 100px;
`;

const ShowHideInfoButton = styled.div`
  display: flex;
  padding: 6px 12px;
  color: white;
  background: rgb(52, 152, 219);
  align-items: center;
  height: 10px;
  cursor: pointer;
  width: 70px;
  justify-content: center;
`;

const TABLE_INFO_STYLE = {
  color: 'black',
  marginBottom: '10px'
};

const propTypes = {
  tiles: PropTypes.array,
  handleDeleteItem: PropTypes.func
};

const defaultProps = {
  tiles: [],
  handleDeleteItem: () => {}
};

export default class TilesInfoPanel extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      openedTilePanels: []
    };
  }

  toggleTileInfo(tileId) {
    const {openedTilePanels} = this.state;

    this.setState({
      openedTilePanels: openedTilePanels.includes(tileId)
        ? openedTilePanels.filter(id => id !== tileId)
        : [...openedTilePanels, tileId]
    });
  }

  renderTileInfo(tile) {
    const tileInfo = getShortTileDebugInfo(tile);
    return <AttributesTable border={1} style={TABLE_INFO_STYLE} data={tileInfo} />;
  }

  render() {
    const {tiles, handleDeleteItem} = this.props;
    const {openedTilePanels} = this.state;

    return (
      <TilesContainer>
        {tiles.map(tile => (
          <TileItem key={tile.id}>
            <TileControl>
              <FontAwesomeIcon
                style={{cursor: 'pointer', color: 'red'}}
                icon={faTrash}
                onClick={() => handleDeleteItem(tile.id)}
              />
              <Tile>{`Tile ID - ${tile.id}`}</Tile>
              <ShowHideInfoButton onClick={() => this.toggleTileInfo(tile.id)}>
                {`Show ${openedTilePanels.includes(tile.id) ? 'less' : 'more'}`}
              </ShowHideInfoButton>
            </TileControl>
            {openedTilePanels.includes(tile.id) && this.renderTileInfo(tile)}
          </TileItem>
        ))}
      </TilesContainer>
    );
  }
}

TilesInfoPanel.propTypes = propTypes;
TilesInfoPanel.defaultProps = defaultProps;
