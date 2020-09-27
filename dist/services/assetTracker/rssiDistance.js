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
const mathjs_1 = require("mathjs");
const onnx = require("onnxjs-node");
const onnxjs_1 = require("onnxjs");
class PathLossModel {
    constructor() {
        this.maxSequenceLength = parseInt(process.env.MODELSEQLENGTH);
        this.session = new onnx.InferenceSession({ backendHint: "onnxruntime" });
        this.modelPath = process.env.MODELPATH;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.session.loadModel(this.modelPath);
        });
    }
    compute(rssi, txPower) {
        return __awaiter(this, void 0, void 0, function* () {
            // Devide the rssi matrix with corresponding txPower.
            for (var i = 0; i < rssi.length; i++) {
                rssi[i] = mathjs_1.divide(rssi[i], txPower[i]);
                // If we had more data than what module elplicitly (maxSequenceLength) need,
                // we slice it to the maxSequenceLength
                if (rssi[i].length > this.maxSequenceLength) {
                    rssi[i] = rssi[i].slice(Math.max(rssi[i].length - this.maxSequenceLength, 0));
                }
            }
            // Flatten the rssi and convert to tensor.
            let inputFloatArray = new Float32Array(mathjs_1.flatten(rssi));
            const input = new onnxjs_1.Tensor(inputFloatArray, "float32", [
                rssi.length,
                this.maxSequenceLength
            ]);
            // Run the inference
            const output = (yield this.session.run([input])).get('distance');
            return output.data;
        });
    }
}
exports.PathLossModel = PathLossModel;
//# sourceMappingURL=rssiDistance.js.map