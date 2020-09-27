"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const couchBase_1 = require("./couchBase");
const couchBase_2 = require("../geojson/couchBase");
const turf = require("turf");
// Get all the beacons to scope the scanning process
let beacons = {
    path: "/api/v1/beacons",
    method: "get",
    handler: [
        ({ query }, res) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield couchBase_1.getBeacons(query.q);
            res.status(200).send(JSON.stringify(result));
        }),
    ],
};
exports.beacons = beacons;
function distance(from, to) {
    from = turf.point([from[0], from[1]]);
    to = turf.point([to[0], to[1]]);
    return turf.distance(from, to, { units: "kilometers" }) * 1000;
}
// During callibation, we also return the distance to the beacons
// Which will be used to calculate the variance against the observations
let beaconsWithCallibration = {
    path: "/api/v1/beaconscalibration",
    method: "get",
    handler: [
        ({ query }, res) => __awaiter(void 0, void 0, void 0, function* () {
            if ("lat" in query && "lon" in query) {
                const geoJson = (yield couchBase_2.getPlace(query.q)).features;
                // Get all the stationary beacons
                const points = geoJson.filter((element) => element.geometry.type === "Point" && element.properties.type === "beacon");
                // If we know this facility and we found some stationary beacons
                // in the database,
                let response = [];
                if (points.length > 0) {
                    for (var i = 0; i < points.length; i++) {
                        response.push([points[i].properties.address, distance([query.lat, query.lon], points[i].geometry.coordinates)]);
                    }
                }
                res.status(200).send(JSON.stringify(response));
            }
            else {
                // Just send the beacon mac addresses
                const result = yield couchBase_1.getBeacons(query.q);
                res.status(200).send(JSON.stringify(result));
            }
        }),
    ],
};
exports.beaconsWithCallibration = beaconsWithCallibration;
//# sourceMappingURL=route.js.map