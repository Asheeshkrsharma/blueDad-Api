"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = __importDefault(require("./geojson/route"));
const route_2 = require("./beacons/route");
exports.default = [route_1.default, route_2.beacons, route_2.beaconsWithCallibration];
//# sourceMappingURL=index.js.map