// https://itnext.io/production-ready-node-js-rest-apis-setup-using-typescript-postgresql-and-redis-a9525871407

import http from "http";
import express from "express";
import { applyMiddleware, applyRoutes } from "./utils";
import routes from "./services";
import { AssetTracker } from "./services/assetTracker";
import middleware from "./middleware";
const turf = require("turf");
import io from "socket.io";

const router = express();
applyMiddleware(middleware, router);
applyRoutes(routes, router);

const { PORT = 3000 } = process.env;
const server = http.createServer(router);
const socketIO = io(server);

// socketIO.on("connection", function(socket) {
//   console.log("a user connected");
//   socket.on("disconnect", function() {
//     console.log("user disconnected");
//   });
// });

// Tracker setup.
const assetUpdate = (collection: Array<any>) => {
  collection = turf.featureCollection(collection);
  socketIO.emit("locationUpdate", collection);
  // console.log(JSON.stringify(collection));
};

const assetTracker = new AssetTracker(assetUpdate);

server.listen(PORT, () => console.log(`Server is running http://localhost:${PORT}`));
