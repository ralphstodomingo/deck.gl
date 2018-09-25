import {Layer} from '@deck.gl/core';
import {getDeckInstance, addLayer, removeLayer, updateLayer, drawLayer} from './deck-utils';

export default class MapboxLayer extends Layer {
  /* eslint-disable no-this-before-super */
  constructor(props) {
    if (!props.id) {
      throw new Error('Layer must have an unique id');
    }

    // Mapbox custom layer fields
    this.type = 'custom';
    this.renderingMode = '3d';

    // MapboxLayer fields
    this.map = null;
    this.deck = null;
    this._props = props;

    super(
      Object.assign({}, props, {
        visible: false
      })
    );
  }

  /* deck.Layer methods */

  _initialize() {
    this.internalState = {};
    this.state = {};
  }

  _transferState(oldLayer) {
    this.internalState = oldLayer.internalState;
    this.state = oldLayer.state;
    this.map = oldLayer.map;
    this.deck = oldLayer.deck;

    updateLayer(this.deck, oldLayer, this);
  }

  _update() {
    // do nothing
  }

  /* Mapbox custom layer methods */

  onAdd(map, gl) {
    this.map = map;
    this.deck = getDeckInstance({map, gl, context: this.context});
    addLayer(this.deck, this);
  }

  onRemove() {
    removeLayer(this.deck, this);
  }

  setProps(props) {
    // id cannot be changed
    Object.assign(this.props, props, {id: this.id});
    updateLayer(this.deck, this, this);
  }

  render(gl, matrix) {
    this.deck.setProps({
      viewState: this._getViewState()
    });
    drawLayer(this.deck, this);
  }

  /* Private API */

  _getViewState() {
    const {map, deck} = this;
    const {lng, lat} = map.getCenter();
    return {
      longitude: lng,
      latitude: lat,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      nearZMultiplier: deck.height ? 1 / deck.height : 1,
      farZMultiplier: 1
    };
  }
}
