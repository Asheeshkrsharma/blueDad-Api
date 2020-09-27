// implementation of CustomLayerInterface to draw a pulsing dot icon on the map
// see https://docs.mapbox.com/mapbox-gl-js/api/#customlayerinterface for more info
var size = 50;
var socket = io('http://localhost:3000');

var pulsingDot = {
  width: size,
  height: size,
  data: new Uint8Array(size * size * 4),

  // get rendering context for the map canvas when layer is added to the map
  onAdd: function () {
    var canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    this.context = canvas.getContext("2d");
  },

  // called once before every frame where the icon will be used
  render: function () {
    var duration = 1000;
    var t = (performance.now() % duration) / duration;

    var radius = (size / 2) * 0.3;
    var outerRadius = (size / 2) * 0.7 * t + radius;
    var context = this.context;

    // draw outer circle
    context.clearRect(0, 0, this.width, this.height);
    context.beginPath();
    context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 200, 200," + (1 - t) + ")";
    context.fill();

    // draw inner circle
    context.beginPath();
    context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 100, 100, 1)";
    context.strokeStyle = "white";
    context.lineWidth = 2 + 4 * (1 - t);
    context.fill();
    context.stroke();

    // update this image's data with data from the canvas
    this.data = context.getImageData(0, 0, this.width, this.height).data;

    // continuously repaint the map, resulting in the smooth animation of the dot
    map.triggerRepaint();

    // return `true` to let the map know that the image was updated
    return true;
  }
};

style = "mapbox://styles/ashukat/ck7mdetf508c01iplisw2pfeh";
// style='mapbox://styles/ashukat/ck7mdfrr01ia01ipjw1g7bko8'
mapboxgl.accessToken =
  "pk.eyJ1IjoiYXNodWthdCIsImEiOiJjajR0Z2E1OTUwNDM0MnFxamV2MDUwem15In0.oJudD_-_OzKiuWXwwGGRQA";
var map = new mapboxgl.Map({
  container: "map",
  style: style,
  center: [-2.578991932460667, 51.47715712483776, 2.5298950811848044],
  zoom: 21,
  pitch: 80,
  bearing: -122.33979238754321
});

map.on("load", function () {
  map.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });
  map.addSource("floorplan", {
    type: "geojson",
    data: "http://localhost:3000/api/v1/geojson?q=flat8"
  });
  map.addLayer({
    id: "room-floor",
    type: "fill",
    source: "floorplan",
    paint: {
      "fill-color": "#738cce",
      "fill-opacity": 1,
      "fill-outline-color": "#ffffff"
    }
  });
  map.addLayer({
    id: "room-extrusion",
    type: "fill-extrusion",
    source: "floorplan",
    filter: ["all", ["==", "name", "wall"]],
    paint: {
      "fill-extrusion-color": "#DB4437",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base_height"],
      "fill-extrusion-opacity": 0.9,
      "fill-extrusion-vertical-gradient": true
    }
  });
  map.addLayer({
    id: "poi-labels",
    type: "symbol",
    source: "floorplan",
    filter: [
      "all",
      ["!=", "name", "door"],
      ["!=", "name", "wall"],
      ["!=", "name", "startups"]
    ],
    layout: {
      "text-field": ["get", "name"],
      "text-variable-anchor": ["top", "bottom", "left", "right"],
      "text-radial-offset": 0.1,
      "text-justify": "auto",
    },
    paint: {
      "text-color": "#FFFFFF",
    }
  });
  map.addLayer({
    id: "beacons",
    type: "symbol",
    source: "floorplan",
    filter: ["all", ["==", "type", "beacon"]],
    layout: {
      "text-field": ["get", "name"],
      "text-variable-anchor": ["top", "bottom", "left", "right"],
      "text-radial-offset": 0.2,
      "text-justify": "auto",
      "icon-image": "pulsing-dot"
    }
  });
});

map.on('load', function () {
  map.addSource('drone', {
    type: 'geojson', data: {
      "type": "FeatureCollection",
      "features": []
    }
  });
  socket.on('locationUpdate', function (msg) {
    map.getSource('drone').setData(msg);
  });
  map.addLayer({
    'id': 'drone',
    'type': 'symbol',
    'source': 'drone',
    'layout': {
      'icon-image': 'veterinary-15'
    }
  });
});