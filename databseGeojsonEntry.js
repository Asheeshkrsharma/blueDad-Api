const uuidv4 = require('uuid/v4');

var couchbase = require('couchbase');
var cluster = new couchbase.Cluster('localhost:8091',
    {
        username: 'Administrator',
        password: '123321qwe',
    });
var bucket = cluster.bucket('geojson');
var coll = bucket.defaultCollection();

const fs = require('fs');
let rawdata = fs.readFileSync('/home/asheesh/Documents/Floorplan/QGIS_MAP/mullerhouse/mullerhouse.geojson');
let features = JSON.parse(rawdata).features;

var featureArray = [];
for (var i = 0; i < features.length; i += 1) {
    var record = features[i];
    var id = uuidv4();
    var feature = {};
    if (record.properties.hasOwnProperty('name')) {
        feature = {
            "_id": id,
            "type": "Feature",
            "geometry": record.geometry,
            "properties": {
                "name": record.properties.name,
                "level": record.properties.level,
                "height": record.properties.height,
                "base_height": record.properties.base_height,
                "beacon": undefined,
            }
        };
        featureArray.push(feature);
    } else {
        feature = {
            "_id": id,
            "type": "Feature",
            "geometry": record.geometry,
            "properties": {
                "name": 'beacon',
                "level": record.properties.level,
                "height": record.properties.height,
                "base_height": record.properties.base_height,
                "beacon": { address: undefined, txpower: undefined },
            }
        };
        featureArray.push(feature);
    }
}

coll.upsert('flat8', features, (err, res) => {
    if (err) throw err;
   
    coll.get('flat8', (err, res) => {
      if (err) throw err;
   
      console.log(res.value);
      // {name: Frank}
    });
});