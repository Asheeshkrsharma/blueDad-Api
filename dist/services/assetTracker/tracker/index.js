"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const trilateration_1 = require("./trilateration");
const mqtt_1 = __importDefault(require("mqtt"));
var options = {
    port: 15255,
    host: 'mqtt://maqiatto.com',
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    username: 'proof1234@gmail.com',
    password: '123321qwe',
    keepalive: 60,
    reconnectPeriod: 1000,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    encoding: 'utf8'
};
class AssetTracker {
    constructor() {
        this.mqttClient = mqtt_1.default.connect('mqtt:maqiatto.com', options);
        this.Tri = new trilateration_1.Trilateration();
        this.mqttClient.on('connect', function () {
            console.log('connected');
        });
    }
}
exports.default = AssetTracker;
//# sourceMappingURL=index.js.map