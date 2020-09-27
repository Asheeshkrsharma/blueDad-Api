"use strict";
// https://itnext.io/production-ready-node-js-rest-apis-setup-using-typescript-postgresql-and-redis-a9525871407
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const utils_1 = require("./utils");
const services_1 = __importDefault(require("./services"));
const assetTracker_1 = require("./services/assetTracker");
const middleware_1 = __importDefault(require("./middleware"));
const turf = require("turf");
const socket_io_1 = __importDefault(require("socket.io"));
const router = express_1.default();
utils_1.applyMiddleware(middleware_1.default, router);
utils_1.applyRoutes(services_1.default, router);
const { PORT = 3000 } = process.env;
const server = http_1.default.createServer(router);
const socketIO = socket_io_1.default(server);
// socketIO.on("connection", function(socket) {
//   console.log("a user connected");
//   socket.on("disconnect", function() {
//     console.log("user disconnected");
//   });
// });
// Tracker setup.
const assetUpdate = (collection) => {
    collection = turf.featureCollection(collection);
    socketIO.emit("locationUpdate", collection);
    // console.log(JSON.stringify(collection));
};
const assetTracker = new assetTracker_1.AssetTracker(assetUpdate);
server.listen(PORT, () => console.log(`Server is running http://localhost:${PORT}`));
//# sourceMappingURL=server.js.map