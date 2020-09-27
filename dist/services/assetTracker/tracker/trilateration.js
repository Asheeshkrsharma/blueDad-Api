"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mathjs_1 = require("mathjs");
class Beacon {
    constructor(lat, lon, distance) {
        this.lat = lat;
        this.lon = lon;
        this.distance = distance;
    }
}
exports.Beacon = Beacon;
class Trilateration {
    constructor() {
        // equitorial radius (semi-major axis)
        this.a = 6378137;
        this.f = 1 / 298.257223563;
        // first eccentricity squared
        this.e2 = (2 - this.f) * this.f;
        this.b = this.a * (1 - this.f);
        this.asqr = this.a * this.a;
        this.bsqr = this.b * this.b;
        this.e = Math.sqrt((this.asqr - this.bsqr) / this.asqr);
        this.eprime = Math.sqrt((this.asqr - this.bsqr) / this.bsqr);
    }
    LatLonECEF(lat, lon, elevation) {
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
    ECEFLatLon(X, Y, Z) {
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
    getN(latitude) {
        var sinlatitude = Math.sin(latitude);
        var denom = Math.sqrt(1 - this.e * this.e * sinlatitude * sinlatitude);
        var N = this.a / denom;
        return N;
    }
    /**
     * Perform a trilateration calculation to determine a location
     * based on 3 beacons and their respective distances (in kilometers) to the desired point.
     *
     * @param  {Array} beacons Array of 3 Beacon objects
     * @return {Array}         Array of the format [latitude, longitude]
     */
    compute(beacons) {
        // #using authalic sphere
        // #if using an ellipsoid this step is slightly different
        // #Convert geodetic Lat/Long to ECEF xyz
        const P1 = this.LatLonECEF(beacons[0].lat, beacons[0].lon);
        const P2 = this.LatLonECEF(beacons[1].lat, beacons[1].lon);
        const P3 = this.LatLonECEF(beacons[2].lat, beacons[2].lon);
        // #from wikipedia
        // #transform to get circle 1 at origin
        // #transform to get circle 2 on x axis
        let ex = mathjs_1.subtract(P2, P1);
        ex = mathjs_1.divide(ex, mathjs_1.norm(ex));
        var i = mathjs_1.dot(ex, mathjs_1.subtract(P3, P1));
        let ey = mathjs_1.subtract(P3, P1);
        ey = mathjs_1.divide(mathjs_1.subtract(ey, mathjs_1.multiply(i, ex)), mathjs_1.norm(mathjs_1.subtract(ey, mathjs_1.multiply(i, ex))));
        var ez = mathjs_1.cross(ex, ey);
        var d = mathjs_1.norm(mathjs_1.subtract(P2, P1));
        var j = mathjs_1.dot(ey, mathjs_1.subtract(P3, P1));
        // #from wikipedia
        // #plug and chug using above values
        const x = (Math.pow(beacons[0].distance, 2) -
            Math.pow(beacons[1].distance, 2) +
            Math.pow(d, 2)) /
            (2 * d);
        const y = (Math.pow(beacons[0].distance, 2) -
            Math.pow(beacons[2].distance, 2) +
            Math.pow(i, 2) +
            Math.pow(j, 2)) /
            (2 * j) -
            (i / j) * x;
        var z = ((Math.pow(beacons[0].distance, 2) -
            Math.pow(x, 2)) - Math.pow(y, 2));
        z = z > 0 ? mathjs_1.sqrt(z) : -1 * mathjs_1.sqrt(mathjs_1.abs(z));
        // #triPt is an array with ECEF x,y,z of trilateration point
        var triPt = mathjs_1.add(mathjs_1.add(mathjs_1.add(P1, mathjs_1.multiply(x, ex)), mathjs_1.multiply(y, ey)), mathjs_1.multiply(z, ez));
        return this.ECEFLatLon(triPt[0], triPt[1], triPt[2]);
    }
}
exports.Trilateration = Trilateration;
//# sourceMappingURL=trilateration.js.map