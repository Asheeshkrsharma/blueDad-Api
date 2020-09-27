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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var couchbase = require('couchbase');
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var cluster = new couchbase.Cluster('localhost:8091', {
    username: process.env.COUCHBASE_UNAME,
    password: process.env.COUCHBASE_PASS,
});
var bucket = cluster.bucket('geojson');
var coll = bucket.defaultCollection();
exports.default = [
    {
        path: "/api/v1/geojson",
        method: "get",
        handler: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            res.send("Hello world!");
        })
    }
];
//# sourceMappingURL=routes.js.map