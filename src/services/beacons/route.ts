import { Request, Response, response } from "express";
import { getBeacons } from "./couchBase";
import { getPlace } from "../geojson/couchBase";
const turf = require("turf");

// Get all the beacons to scope the scanning process
let beacons = {
  path: "/api/v1/beacons",
  method: "get",
  handler: [
    async ({ query }: Request, res: Response) => {
      const result = await getBeacons(query.q);
      res.status(200).send(JSON.stringify(result));
    },
  ],
};

function distance(from:number[], to:number[]){
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
    async ({ query }: Request, res: Response) => {
      if ("lat" in query && "lon" in query) {
        const geoJson = (await getPlace(query.q)).features;
        // Get all the stationary beacons
        const points = geoJson.filter(
          (element: any) => element.geometry.type === "Point" && element.properties.type === "beacon"
        );
        // If we know this facility and we found some stationary beacons
        // in the database,
        let response:Array<any> = [];
        if (points.length > 0) {
          for (var i = 0; i < points.length; i++) {
            response.push([points[i].properties.address, distance([query.lat, query.lon], points[i].geometry.coordinates)]);
          }
        }
        res.status(200).send(JSON.stringify(response));
      } else {
        // Just send the beacon mac addresses
        const result = await getBeacons(query.q);
        res.status(200).send(JSON.stringify(result));        
      }
    },
  ],
};

export { beacons, beaconsWithCallibration };
