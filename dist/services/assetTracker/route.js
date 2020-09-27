"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tracker_1 = require("./tracker");
const turf = require("turf");
const assetUpdate = (collection) => {
    collection = turf.featureCollection(collection);
    console.log(JSON.stringify(collection));
};
var tracker = new tracker_1.AssetTracker(assetUpdate);
exports.default = tracker;
//# sourceMappingURL=route.js.map