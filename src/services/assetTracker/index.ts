const fs = require("fs");

import * as url from "url";
import mqtt from "mqtt";

import { fromEvent, fromEventPattern, Observable, merge, empty } from "rxjs";
import { map } from "rxjs/operators";

import { Beacon, Trilateration } from "./trilateration";
import { getPlace } from "../geojson/couchBase";
import { PathLossModel } from "./rssiDistance";
import { AutoExpringArray } from "./AutoExpiringArray";

interface Rssi {
  data: number[];
  txP: number;
}

interface Asset {
  address: string;
  facility: string;
  rssi: { [key: string]: Rssi };
  lat?: number | string;
  lon?: number | string;
}

export interface StationaryBeacons {
  lat: number;
  lon: number;
}

interface BeaconTable {
  [key: string]: { [key: string]: StationaryBeacons };
}

export class AssetTracker {
  private Assets: { [key: string]: AutoExpringArray };
  private Tri: Trilateration;
  private mqttClient: mqtt.Client;
  private subsciber:(arg: any) => void;

  // Lookup table for stationary beacons by facility
  private beaconTable: BeaconTable = {};
  private pathLossModel!: PathLossModel;
  private assetExpiryInterval: number;
  public updatObservable: Observable<any>;
  constructor(subscriber: (arg: any) => void) {
    this.Assets = {};
    this.assetExpiryInterval = parseInt(process.env.ASSETEXPIRYINTERVAL as string);
    // Setup Trilateration
    this.Tri = new Trilateration();

    // Setup MQTT
    const mqtt_url: any = url.parse(process.env.MQTT_HOST_URL as string);
    this.mqttClient = mqtt.connect("mqtt://" + mqtt_url.hostname, {
      port: mqtt_url.port,
      clientId:
        "clientId-" +
        Math.random()
          .toString(16)
          .substr(2, 8),
      username: process.env.MQTT_UNAME as string,
      password: process.env.MQTT_PASS as string,
      keepalive: 60
    });

    // After the connection, subscribe to a topic and forward the message
    // to assetMessageHandler
    let superThis = this;
    fromEvent(this.mqttClient, "connect")
      .pipe(
        map(async event => {
          // Notice the power of Observables,
          // I can use async in a Typescript constructer
          // Bending the rules yo!
          // Return an observable which points on the message event
          this.mqttClient.subscribe("proof1234@gmail.com/assets");

          // This is a async process.
          this.pathLossModel = new PathLossModel();
          await this.pathLossModel.initialize();
          return fromEvent(this.mqttClient, "message").pipe(map(event => event));
        })
      )
      .subscribe(async res => {
        // Subscribe to the message event and pass the incoming data
        // to assetMessageHandler.
        (await res).subscribe((event: any) => {
          try {
            this.assetMessageHandler(JSON.parse(event[1].toString("utf8")));
          } catch (SyntaxError) {
            console.log(`Invalid message ${event[1].toString("utf8")}`);
          }
        });
      });
      this.updatObservable = empty();
      this.subsciber = subscriber;
  }

  private async assetMessageHandler(asset: Asset) {
    // Get a beacons belonging to facility by name from the database
    if (!(asset.facility in this.beaconTable)) {
      // Get the assciated geojson object
      const geoJson = (await getPlace(asset.facility)).features;

      // Get all the stationary beacons
      const points = geoJson.filter(
        (element: any) => element.geometry.type === "Point" && element.properties.type === "beacon"
      );
      // If we know this facility and we found some stationary beacons
      // in the database,
      if (points.length > 0) {
        // Initilize the BeaconTable entry
        this.beaconTable[asset.facility] = {};
        // Loop thorugh the geojson data.
        for (var i = 0; i < points.length; i++) {
          let address = points[i].properties.address;
          let beacon: StationaryBeacons = {
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
      this.Assets[asset.facility] = new AutoExpringArray(this.assetExpiryInterval,
        true);
      // Next attach an observable on the push events emmited by the AutoExpiring array
      const assetUpdateObservable = fromEventPattern(
        this.Assets[asset.facility].addUpdateListener.bind(this.Assets[asset.facility]),
        this.Assets[asset.facility].removeUpdateListener.bind(this.Assets[asset.facility])
      );
      // Merge this observable with the globally observable one.
      this.updatObservable = merge(this.updatObservable, assetUpdateObservable);
      // and resubscribe the subscriber.
      this.updatObservable.subscribe(this.subsciber);
    }

    // Now batch process the rssi to distance
    if (asset.facility in this.beaconTable) {
      // Get the beacon addresses for which we have the
      // rssi data.
      const stationaryBeacons = Object.keys(asset.rssi);
      // Now prepare the input for rssi distancing.
      let rssi: number[][] = []; // to hold rssi.
      let txPower: number[] = []; // to hold correspoing txPower of the beacon.
      let beacons: Beacon[] = []; // To be pass to trilateration.

      stationaryBeacons.forEach((beaconAddress: string) => {
        if (beaconAddress in this.beaconTable[asset.facility]) {
          let tx = asset.rssi[beaconAddress].txP;
          let rx = asset.rssi[beaconAddress].data;
          let mean = asset.rssi[beaconAddress].data.reduce((a,b) => a + b, 0) / asset.rssi[beaconAddress].data.length;

          rssi.push(rx);
          txPower.push(tx);
          let b: Beacon = {
            lat: this.beaconTable[asset.facility][beaconAddress].lat,
            lon: this.beaconTable[asset.facility][beaconAddress].lon,
            distance: -20, // Filler, the actual distance will be calculated next
            meanRSSI: mean
          };
          beacons.push(b);
        }
      });
      // We need at least three beacons to triangulate the asset
      if (beacons.length >= 3) {
        // Compute the distance based on the rssi readings.
        const distances: number[] = await this.pathLossModel.compute(rssi, txPower);
        for (var i = 0; i < beacons.length; i++) {
          beacons[i].distance = distances[i];
        }
        const assetLocationGeoJSON: any = this.Tri.compute(beacons);
        assetLocationGeoJSON.properties.address = asset.address;
        assetLocationGeoJSON.properties.facility = asset.facility;
        this.Assets[asset.facility].push(assetLocationGeoJSON, asset.address);
      }
    }

    // Check if it was a callibration packet. If yes write
    // to a file.
    if ("lat" in asset && "lon" in asset) {
      const cordinates = [parseFloat(asset.lat as string), parseFloat(asset.lon as string)];
      Object.keys(asset.rssi).forEach((address: string) => {
        if (address in this.beaconTable[asset.facility]) {
          const dist = this.Tri.distance(
            [this.beaconTable[asset.facility][address].lat, this.beaconTable[asset.facility][address].lon],
            cordinates
          );
          const record = `${address} ${asset.rssi[address].data} ${asset.rssi[address].txP} ${dist}\n`;
          console.log(record);
          fs.appendFile(`${asset.address}.csv`, record, (err: Error) => {
            if (err) console.error("Couldn't append the data");
          });
        }
      });
    }
  }
}
