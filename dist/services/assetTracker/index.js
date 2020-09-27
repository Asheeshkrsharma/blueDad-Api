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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const url = __importStar(require("url"));
const mqtt_1 = __importDefault(require("mqtt"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const trilateration_1 = require("./trilateration");
const couchBase_1 = require("../geojson/couchBase");
const rssiDistance_1 = require("./rssiDistance");
const AutoExpiringArray_1 = require("./AutoExpiringArray");
class AssetTracker {
    constructor(subscriber) {
        // Lookup table for stationary beacons by facility
        this.beaconTable = {};
        this.Assets = {};
        this.assetExpiryInterval = parseInt(process.env.ASSETEXPIRYINTERVAL);
        // Setup Trilateration
        this.Tri = new trilateration_1.Trilateration();
        // Setup MQTT
        const mqtt_url = url.parse(process.env.MQTT_HOST_URL);
        this.mqttClient = mqtt_1.default.connect("mqtt://" + mqtt_url.hostname, {
            port: mqtt_url.port,
            clientId: "clientId-" +
                Math.random()
                    .toString(16)
                    .substr(2, 8),
            username: process.env.MQTT_UNAME,
            password: process.env.MQTT_PASS,
            keepalive: 60
        });
        // After the connection, subscribe to a topic and forward the message
        // to assetMessageHandler
        let superThis = this;
        rxjs_1.fromEvent(this.mqttClient, "connect")
            .pipe(operators_1.map((event) => __awaiter(this, void 0, void 0, function* () {
            // Notice the power of Observables,
            // I can use async in a Typescript constructer
            // Bending the rules yo!
            // Return an observable which points on the message event
            this.mqttClient.subscribe("proof1234@gmail.com/assets");
            // This is a async process.
            this.pathLossModel = new rssiDistance_1.PathLossModel();
            yield this.pathLossModel.initialize();
            return rxjs_1.fromEvent(this.mqttClient, "message").pipe(operators_1.map(event => event));
        })))
            .subscribe((res) => __awaiter(this, void 0, void 0, function* () {
            // Subscribe to the message event and pass the incoming data
            // to assetMessageHandler.
            (yield res).subscribe((event) => {
                try {
                    this.assetMessageHandler(JSON.parse(event[1].toString("utf8")));
                }
                catch (SyntaxError) {
                    console.log(`Invalid message ${event[1].toString("utf8")}`);
                }
            });
        }));
        this.updatObservable = rxjs_1.empty();
        this.subsciber = subscriber;
    }
    assetMessageHandler(asset) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get a beacons belonging to facility by name from the database
            if (!(asset.facility in this.beaconTable)) {
                // Get the assciated geojson object
                const geoJson = (yield couchBase_1.getPlace(asset.facility)).features;
                // Get all the stationary beacons
                const points = geoJson.filter((element) => element.geometry.type === "Point" && element.properties.type === "beacon");
                // If we know this facility and we found some stationary beacons
                // in the database,
                if (points.length > 0) {
                    // Initilize the BeaconTable entry
                    this.beaconTable[asset.facility] = {};
                    // Loop thorugh the geojson data.
                    for (var i = 0; i < points.length; i++) {
                        let address = points[i].properties.address;
                        let beacon = {
                            lat: points[i].geometry.coordinates[0],
                            lon: points[i].geometry.coordinates[1]
                        };
                        this.beaconTable[asset.facility][address] = beacon;
                    }
                }
            }
            // Check if this facility exists in the observable auto expriring Asset array
            if (!(asset.facility in this.Assets)) {
                // Elements expire after a set interval.
                // We also pass true as the second argument because
                // the data is supposed to be non redundant.
                // (i.e. assets with same address are not allowed)
                this.Assets[asset.facility] = new AutoExpiringArray_1.AutoExpringArray(this.assetExpiryInterval, true);
                // Next attach an observable on the push events emmited by the AutoExpiring array
                const assetUpdateObservable = rxjs_1.fromEventPattern(this.Assets[asset.facility].addUpdateListener.bind(this.Assets[asset.facility]), this.Assets[asset.facility].removeUpdateListener.bind(this.Assets[asset.facility]));
                // Merge this observable with the globally observable one.
                this.updatObservable = rxjs_1.merge(this.updatObservable, assetUpdateObservable);
                // and resubscribe the subscriber.
                this.updatObservable.subscribe(this.subsciber);
            }
            // Now batch process the rssi to distance
            if (asset.facility in this.beaconTable) {
                // Get the beacon addresses for which we have the
                // rssi data.
                const stationaryBeacons = Object.keys(asset.rssi);
                // Now prepare the input for rssi distancing.
                let rssi = []; // to hold rssi.
                let txPower = []; // to hold correspoing txPower of the beacon.
                let beacons = []; // To be pass to trilateration.
                stationaryBeacons.forEach((beaconAddress) => {
                    if (beaconAddress in this.beaconTable[asset.facility]) {
                        let tx = asset.rssi[beaconAddress].txP;
                        let rx = asset.rssi[beaconAddress].data;
                        let mean = asset.rssi[beaconAddress].data.reduce((a, b) => a + b, 0) / asset.rssi[beaconAddress].data.length;
                        rssi.push(rx);
                        txPower.push(tx);
                        let b = {
                            lat: this.beaconTable[asset.facility][beaconAddress].lat,
                            lon: this.beaconTable[asset.facility][beaconAddress].lon,
                            distance: -20,
                            meanRSSI: mean
                        };
                        beacons.push(b);
                    }
                });
                // We need at least three beacons to triangulate the asset
                if (beacons.length >= 3) {
                    // Compute the distance based on the rssi readings.
                    const distances = yield this.pathLossModel.compute(rssi, txPower);
                    for (var i = 0; i < beacons.length; i++) {
                        beacons[i].distance = distances[i];
                    }
                    const assetLocationGeoJSON = this.Tri.compute(beacons);
                    assetLocationGeoJSON.properties.address = asset.address;
                    assetLocationGeoJSON.properties.facility = asset.facility;
                    this.Assets[asset.facility].push(assetLocationGeoJSON, asset.address);
                }
            }
            // Check if it was a callibration packet. If yes write
            // to a file.
            if ("lat" in asset && "lon" in asset) {
                const cordinates = [parseFloat(asset.lat), parseFloat(asset.lon)];
                Object.keys(asset.rssi).forEach((address) => {
                    if (address in this.beaconTable[asset.facility]) {
                        const dist = this.Tri.distance([this.beaconTable[asset.facility][address].lat, this.beaconTable[asset.facility][address].lon], cordinates);
                        const record = `${address} ${asset.rssi[address].data} ${asset.rssi[address].txP} ${dist}\n`;
                        console.log(record);
                        fs.appendFile(`${asset.address}.csv`, record, (err) => {
                            if (err)
                                console.error("Couldn't append the data");
                        });
                    }
                });
            }
        });
    }
}
exports.AssetTracker = AssetTracker;
//# sourceMappingURL=index.js.map