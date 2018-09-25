import {Deck} from '@deck.gl/core';

export function getDeckInstance({map, gl, context}) {
  // Only create one deck instance per context
  if (map.__deck) {
    return map.__deck;
  }

  const deck = new Deck({
    gl,
    width: '100%',
    height: '100%',
    controller: false,
    useDevicePixels: true,
    // layerFilter needs to be changed inside a rendering/picking cycle
    // But calling setProps({layerFilter}) will trigger another rerender which sets off an infinite loop
    // Instead, we use a constant callback here and access the dynamic filter in userData
    layerFilter: ({layer}) => filterLayer(deck, layer),
    _customRender: () => map.triggerRepaint(),
    userData: {
      mapboxLayers: new Set()
    }
  });
  map.__deck = deck;

  map.on('remove', () => {
    deck.finalize();
    map.__deck = null;
  });

  initEvents(map, deck, context);

  return deck;
}

export function addLayer(deck, layer) {
  deck.props.userData.mapboxLayers.add(layer);
  updateLayers(deck);
}

export function removeLayer(deck, layer) {
  deck.props.userData.mapboxLayers.delete(layer);
  updateLayers(deck);
}

export function updateLayer(deck, oldLayer, newLayer) {
  if (oldLayer !== newLayer) {
    const {mapboxLayers} = deck.props.userData;
    mapboxLayers.delete(oldLayer);
    mapboxLayers.add(newLayer);
  }
  updateLayers(deck);
}

export function drawLayer(deck, layer) {
  const parentDeck = layer.context && layer.context.deck;

  if (parentDeck) {
    forwardDeckProps(parentDeck, deck);
  }

  deck.props.userData.layerFilter = layer.id;
  deck._drawLayers('mapbox-repaint');
  deck.needsRedraw({clearRedrawFlags: true});
}

function forwardDeckProps(sourceDeck, targetDeck) {
  const {pickingRadius, _animate, drawPickingColors, onLayerClick, onLayerHover} = sourceDeck.props;
  targetDeck.setProps({pickingRadius, _animate, drawPickingColors, onLayerClick, onLayerHover});
}

function filterLayer(deck, layer) {
  const {layerFilter} = deck.props.userData;

  if (typeof layerFilter !== 'string') {
    return layerFilter;
  }

  let layerInstance = layer;
  while (layerInstance) {
    if (layerInstance.id === layerFilter) {
      return true;
    }
    layerInstance = layerInstance.parent;
  }
  return false;
}

function updateLayers(deck) {
  const layers = [];
  deck.props.userData.mapboxLayers.forEach(deckLayer => {
    const LayerType = deckLayer._props.type;
    const layer = new LayerType(deckLayer._props);
    layers.push(layer);
  });
  deck.setProps({layers});
}

// Register deck callbacks for pointer events
function initEvents(map, deck, context) {
  function handleMouseEvent(event, callback) {
    // draw all layers in picking buffer
    deck.props.userData.layerFilter = true;
    // Map from mapbox's MapMouseEvent object to mjolnir.js' Event object
    callback(
      event.offsetCenter
        ? event
        : {
            offsetCenter: event.point,
            srcEvent: event.originalEvent
          }
    );
  }

  const parentDeck = context && context.deck;

  if (parentDeck) {
    parentDeck.eventManager.on({
      click: event => handleMouseEvent(event, deck._onClick),
      pointermove: event => handleMouseEvent(event, deck._onPointerMove),
      pointerleave: event => handleMouseEvent(event, deck._onPointerLeave)
    });
  }
  map.on('click', event => handleMouseEvent(event, deck._onClick));
  map.on('mousemove', event => handleMouseEvent(event, deck._onPointerMove));
  map.on('mouseleave', event => handleMouseEvent(event, deck._onPointerLeave));
}
