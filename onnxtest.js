const onnx = require('onnxjs-node');
const assert = require('assert');
async function main() {
    // Create an ONNX inference session with WebAssembly backend.
    const session = new onnx.InferenceSession();
    // Load an ONNX model. This model takes two tensors of the same size and return their sum. 
    await session.loadModel("/home/asheesh/Documents/Floorplan/blueDad-ml/attentionDecoder.optim.onnx");
    const input = new onnx.Tensor([
        -0.8481, 0.4489, 0.5399, 1.0189, -0.1761, -0.9743,
        -0.2903, 0.5920, -0.5956, 0.7708, 0.6229, -1.1447,
        -0.7834, 0.6305, -0.6910, -0.5492, -1.4780, -0.4134,
        -0.8505, -1.5578, 1.1341, -2.3345, -1.3929, -0.7042,
        -0.8931, 0.3292, 0.9694, 0.3969, 1.2130, -1.0403,
        0.6385, -0.9907, 0.5360, 0.8529, -0.9677, -0.2853,
        0.6663, 0.5830, -0.4745, -0.8117, -0.9398, -0.5716,
        0.4727, -2.1957, -0.3924, -0.5629, 0.9627, 0.7688,
        -0.5533, -0.0310, 0.6596, -0.3003, -0.4417, -1.1782,
        -1.4108, -0.4205, 2.4699, 0.0357, 1.0205, -1.1637,
        -0.3423, 1.0623, 0.1542, -0.8256, 0.1639, -0.0716,
        1.3328, -1.7440, -2.2822, -1.6475, -1.7488, 0.6654,
        0.9788, -0.1172, -0.3904, 0.2000, 1.4748, 1.4599,
        0.5502, -1.9938, 0.0130, 0.8694, -0.0528, -0.0577,
        0.0465, 0.1267, -0.1513, -0.5273, -0.2799, 1.1677,
        -0.0141, 0.3414, 0.3654, 0.3744, -0.6599, -0.1057,
        0.9945, 0.1375, 0.9032, -0.8079, 0.2731, 0.5943,
        -1.4440, 1.6347, -1.3019, 1.3169, 1.0591, 0.1303,
        -0.5224, 0.7907, -0.9050, -0.4764, -1.5776, 0.0117,
        1.1669, -0.3542, 1.5031, 0.6582, 0.3222, -0.1240
    ], "float32", [
        20,
        6
    ]);
    startTime = new Date();
    var numLoops = 5000;
    for (var i = 0; i < numLoops; i++) {
        // Run model with Tensor inputs and get the result by output name defined in model.
        const outputMap = (await session.run([input])).get('distance');
    }
    var timeDiff = new Date() - startTime;
    timeDiff /= 1000;
    console.log(`${numLoops} inferences took ${Math.round(timeDiff)} seconds, ${(Math.round(timeDiff) / numLoops) * 1000} ms per inference.`)
    // console.log(outputMap)
}

main();