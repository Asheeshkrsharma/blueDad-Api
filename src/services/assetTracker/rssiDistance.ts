import { mean, divide, flatten } from "mathjs";
const onnx = require("onnxjs-node");
import { InferenceSession, Tensor } from "onnxjs";

export class PathLossModel {
  private session: InferenceSession;
  private modelPath: string;
  private maxSequenceLength: number;
  constructor() {
    this.maxSequenceLength = parseInt((process.env.MODELSEQLENGTH as unknown) as string);
    this.session = new onnx.InferenceSession({ backendHint: "onnxruntime" });
    this.modelPath = process.env.MODELPATH as string;
  }

  async initialize() {
    await this.session.loadModel(this.modelPath);
  }

  async compute(rssi: number[][], txPower: number[]): Promise<number[]> {
    // Devide the rssi matrix with corresponding txPower.
    for (var i = 0; i < rssi.length; i++) {
      rssi[i] = divide(rssi[i], txPower[i]) as number[];
      // If we had more data than what module elplicitly (maxSequenceLength) need,
      // we slice it to the maxSequenceLength
      if (rssi[i].length > this.maxSequenceLength) {
        rssi[i] = rssi[i].slice(Math.max(rssi[i].length - this.maxSequenceLength, 0));
      }
    }

    // Flatten the rssi and convert to tensor.
    let inputFloatArray: Float32Array = new Float32Array((flatten(rssi) as unknown) as number[]);
    const input: Tensor = new Tensor(inputFloatArray, "float32", [
      rssi.length, // Batch size
      this.maxSequenceLength
    ]);

    // Run the inference
    const output:Tensor = (await this.session.run([input])).get('distance') as Tensor;
    return output.data as unknown as number[];
  }
}
