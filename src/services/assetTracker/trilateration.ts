import { subtract, divide, norm, dot, multiply, cross, sqrt, abs, add } from "mathjs";
const turf = require("turf");
const LM = require("ml-curve-fitting");

// TBD: Accound for elevation every where. 
// Metres above mean sea level per WGS84
export interface Beacon {
  lat: number;
  lon: number;
  distance: number;
  meanRSSI: number;
}

export class Trilateration {
  // equitorial radius (semi-major axis)
  private a: number = 6378137;
  private f: number = 1 / 298.257223563;
  // first eccentricity squared
  private e2: number = (2 - this.f) * this.f;
  private b: number = this.a * (1 - this.f);
  private asqr: number = this.a * this.a;
  private bsqr: number = this.b * this.b;
  private e: number = Math.sqrt((this.asqr - this.bsqr) / this.asqr);
  private eprime: number = Math.sqrt((this.asqr - this.bsqr) / this.bsqr);
  constructor() {}

  private LatLonECEF(lat: number, lon: number, elevation?: number): number[] {
    var h = elevation === undefined ? 0 : elevation;
    var rlat = (lat / 180) * Math.PI;
    var rlon = (lon / 180) * Math.PI;

    var slat = Math.sin(rlat);
    var clat = Math.cos(rlat);

    var N = this.a / Math.sqrt(1 - this.e2 * slat * slat);

    var x = (N + h) * clat * Math.cos(rlon);
    var y = (N + h) * clat * Math.sin(rlon);
    var z = (N * (1 - this.e2) + h) * slat;
    return [x, y, z];
  }

  private ECEFLatLon(X: number, Y: number, Z: number): number[] {
    //Auxiliary values first
    var p = Math.sqrt(X * X + Y * Y);
    var theta = Math.atan((Z * this.a) / (p * this.b));

    var sintheta = Math.sin(theta);
    var costheta = Math.cos(theta);

    var num = Z + this.eprime * this.eprime * this.b * sintheta * sintheta * sintheta;
    var denom = p - this.e * this.e * this.a * costheta * costheta * costheta;

    //Now calculate LLA
    var latitude = Math.atan(num / denom);
    var longitude = Math.atan(Y / X);
    var N = this.getN(latitude);
    var altitude = p / Math.cos(latitude) - N;

    if (X < 0 && Y < 0) {
      longitude = longitude - Math.PI;
    }

    if (X < 0 && Y > 0) {
      longitude = longitude + Math.PI;
    }
    return [latitude * (180 / Math.PI), longitude * (180 / Math.PI), altitude];
  }

  private getN(latitude: number): number {
    var sinlatitude = Math.sin(latitude);
    var denom = Math.sqrt(1 - this.e * this.e * sinlatitude * sinlatitude);
    var N = this.a / denom;
    return N;
  }

  /**
   * Perform a True range multilateration calculation to determine a location
   * based on 3 beacons and their respective distances (in kilometers) to the desired point.
   *
   * See: https://en.wikipedia.org/wiki/True_range_multilateration
   *
   * @param  {Array} beacons Array of 3 Beacon objects
   * @return {Array}         Array of the format [latitude, longitude]
   */
  public compute(beacons: Beacon[]): number[] {
    // using authalic sphere
    // if using an ellipsoid this step is slightly different
    // Convert geodetic Lat/Long to ECEF xyz
    // Sort array based on the mean rssi value,
    // so that we use the most nearest beacons.
    beacons = beacons.sort((a, b) => b.meanRSSI - a.meanRSSI);
    // Then we also slice the array to a maximum of 5 beacons
    // for the levenberg Marquardt method.
    if (beacons.length > 5){
      beacons = beacons.slice(0, 5);
    }

    const P1: number[] = this.LatLonECEF(beacons[0].lat, beacons[0].lon);
    const P2: number[] = this.LatLonECEF(beacons[1].lat, beacons[1].lon);
    const P3: number[] = this.LatLonECEF(beacons[2].lat, beacons[2].lon);

    // transform to get circle 1 at origin
    let ex: number[] = subtract(P2, P1) as number[];
    ex = divide(ex, norm(ex)) as number[];
    const Vx = dot(ex, subtract(P3, P1) as any);

    // transform to get circle 2 on x axis
    let ey: number[] = subtract(P3, P1) as number[];
    ey = divide(subtract(ey, multiply(Vx, ex)), norm(subtract(ey, multiply(Vx, ex)) as number[])) as number[];
    var ez = cross(ex, ey);
    var U: number = norm(subtract(P2, P1) as number[]) as number;
    const Vy = dot(ey, subtract(P3, P1) as number[]);

    // (r₁)² = x² + y² + z²
    const r1sq = Math.pow(beacons[0].distance, 2);
    // (r₂)² = (x - U)² + y² + z²
    const r2sq = Math.pow(beacons[1].distance, 2);
    // (r₃)² = (x - Vₓ)² + (y-Vy)² + z²
    const r3sq = Math.pow(beacons[2].distance, 2);
    // V² = (Vₓ)² + (Vy)²
    const Vsq = Math.pow(Vx, 2) + Math.pow(Vy, 2);

    // x = ((r₁)² - (r₂)² + U²) / 2U
    const x: number = ((r1sq - r2sq + Math.pow(U, 2)) as number) / (2 * U);
    const xsq: number = Math.pow(x, 2);

    // y = ((r₁)² - (r₃)² + V² - 2Vₓx) / 2Vy
    const y: number = (r1sq - r3sq + Vsq - 2 * Vx * x) / (2 * Vy);
    const ysq: number = Math.pow(y, 2);

    // z = ± √((r₁)² - x² - y²);
    // There will exist two solutions.
    // We can use then as min max may be for levenbergMarquardtTri? TBD
    var z: number = r1sq - xsq - ysq;
    z = z > 0 ? sqrt(z) : sqrt(abs(z));

    // triPt is an array with ECEF x,y,z of trilateration point
    var triPt: number[] = add(add(add(P1, multiply(x, ex)), multiply(y, ey)), multiply(z, ez)) as number[];

    // This is a rough estimate based on three beacons.
    // Lets use this as estimate to a triangulation method which is
    // can take more than three beacons to imporve upon it.

    // return turf.point(this.ECEFLatLon(triPt[0], triPt[1], triPt[2]));
    return this.levenbergMarquardtTri(beacons, triPt);
  }

  public distance(from:number[], to:number[]){
    from = turf.point([from[0], from[1]]);
    to = turf.point([to[0], to[1]]);
    return turf.distance(from, to, { units: "kilometers" }) * 1000;
  }

  private levenbergMarquardtTri(beacons: Beacon[], initialValues: number[]) {
    let Matrix = LM.Matrix; // Used by LM
    let algebra = Matrix.algebra; // Used by LM

    // n-vector of initial guess of parameter values
    const initialGuess = algebra.matrix(initialValues.map(element => [element]));

    // Matrix of independent variables
    let independentVar = algebra.matrix(beacons.length, 3);
    // Matrix of data to be fit
    let distances = algebra.matrix(beacons.length, 1);
    for (var i = 0; i < beacons.length; i++) {
      const coordinates = this.LatLonECEF(beacons[i].lat, beacons[i].lon);
      independentVar[i][0] = coordinates[0];
      independentVar[i][1] = coordinates[1];
      independentVar[i][2] = coordinates[2];
      distances[i][0] = beacons[i].distance;
    }

    // weighting vector for least squares fit ( weight >= 0 )
    const weight: number[] = [1]; // TBD: Check with the new method,

    // inverse of the standard measurement errors
    const SME = -0.0001;

    // Min and Max
    // First we will calculate the min-max (lat lon bounds)
    // Get the min max if exists to bound the problem.
    var collections: any[] = []
    beacons.forEach((beacon: Beacon) => {
      const circle = turf.circle([beacon.lat, beacon.lon], beacon.distance * 0.001, {steps: 10, units: 'kilometers'});
      collections.push(circle.geometry.coordinates);
    });
    var intersections: any[] = [];
    for (var i=0; i<collections.length; i++){
      for (var j=0; j<collections.length; j++){
        if (i != j){
          const intersection = turf.intersect(turf.polygon(collections[i]), turf.polygon(collections[j]));
          if (intersection){
            intersections.push(intersection)
          }  
        }
      }
    }
    const globalBBox = turf.bbox(turf.featureCollection(intersections));
    let minValues: number[] = []; // n-vector of lower bounds for parameter values
    let maxValues: number[] = []; // n-vector of upper bounds for parameter values
    if (globalBBox) {
      minValues = this.LatLonECEF(globalBBox[0], globalBBox[1]);
      maxValues = this.LatLonECEF(globalBBox[2], globalBBox[3]);
    }
    minValues = algebra.matrix(minValues.map(element => [element]));
    maxValues = algebra.matrix(maxValues.map(element => [element]));

    // An optional matrix of values passed to func(t,p,c)
    const constants: number[] = [];

    // TBD: Check with the new method
    // vector of algorithmic parameters
    const opts = [
      2, // prnt 3 >1 intermediate results; >2 plots
      1000, // MaxIter 10*Npar maximum number of iterations
      1e-3, // epsilon_1 1e-3 convergence tolerance for gradient
      1e-3, // epsilon_2 1e-3 convergence tolerance for parameters
      1e-3, // epsilon_3 1e-3 convergence tolerance for Chi-square
      1e-2, // epsilon_4 1e-2 determines acceptance of a L-M step
      1e-2, // lambda_0 1e-2 initial value of L-M paramter
      11, // lambda_UP_fac 11 factor for increasing lambda
      9, // lambda_DN_fac 9 factor for decreasing lambda
      1 // Update_Type 1 1: Levenberg-Marquardt lambda update
    ];

    let distanceFx = (independentVariable: any, prediction: any, parameters: any) => {
      const numRows = independentVariable.rows;
      const to = turf.point(this.ECEFLatLon(prediction[0][0], prediction[1][0], prediction[2][0]));
      let result = new Matrix(numRows, 1);
      for (var i = 0; i < numRows; i++) {
        // Distance between the particular independent Variable and prediction
        let from = turf.point(
          this.ECEFLatLon(
            independentVariable[i][0],
            independentVariable[i][1],
            independentVariable[i][2]
          ).slice(0, 2)
        );
        result[i][0] = turf.distance(from, to, { units: "kilometers" }) * 1000;
      }
      return result;
    };

    var estimate = LM.optimize(
      distanceFx,
      initialGuess,
      independentVar,
      distances,
      weight,
      SME,
      minValues,
      maxValues,
      constants,
      opts
    ).p;

    // TBD check if the solution is in the BBox
    let triPt =  turf.point(this.ECEFLatLon(estimate[0][0], estimate[1][0], estimate[2][0]));
    // console.log(triPt)
    // TBD check if the solution is in the BBox
    return triPt;
  }
}
