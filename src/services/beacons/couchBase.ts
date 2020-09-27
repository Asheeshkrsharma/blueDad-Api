var couchbase = require("couchbase");
import dotenv from "dotenv";

dotenv.config();

var cluster = new couchbase.Cluster("localhost:8091", {
  username: process.env.COUCHBASE_UNAME,
  password: process.env.COUCHBASE_PASS
});

var bucket = cluster.bucket("geojson");
var collection = bucket.defaultCollection();

export const getBeacons = async (query: string) => {
  return await collection
    .get(query, { timeout: 1000 }, (err: Error, res: any) => {})
    .then((res: any) => {
      const beacons = res.value
        .filter((element: any) => {
          return element.properties.type === "beacon" && element.properties.address;
        })
        .map((element: any) => {
          return element.properties.address;
        });
      if (res) {
        return beacons;
      }
    })
    .catch((_e: any) => {
      return [];
    });
};
