"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AutoExpringArray {
    constructor(timeout, nonRedundant) {
        this.nextGC = null;
        this.delay = 5; // ms delay to wait before scheduling a GC after an element should be cleared
        if (!Number.isFinite(timeout))
            throw new Error("Timeout must be a number");
        this.timeout = timeout;
        this.db = [];
        this.isNonRedundant = nonRedundant;
        this.listeners = [];
    }
    scheduleGC() {
        if (this.nextGC)
            return;
        const ts = this.db.length ? this.db[0][0] - Date.now() + this.delay : this.timeout;
        this.nextGC = setTimeout(this.gc.bind(this), ts);
        if (this.nextGC.unref)
            this.nextGC.unref();
    }
    gc() {
        const now = Date.now();
        while (this.db.length && this.db[0][0] < now) {
            this.db.shift();
        }
        this.nextGC = null;
        this.scheduleGC();
    }
    push(elm, identifier) {
        if (!this.db.length)
            this.scheduleGC();
        if (this.isNonRedundant && identifier == undefined)
            throw new Error("Identifier cant be null if the array is non-redundant");
        if (this.isNonRedundant) {
            const idx = this.db.findIndex((value, _) => {
                return value[1] === identifier;
            });
            if (idx != -1) {
                this.db[idx] = [Date.now() + this.timeout, identifier, elm];
            }
            else {
                this.db.push([Date.now() + this.timeout, identifier, elm]);
            }
            if (this.listeners)
                this.listeners.forEach((l) => {
                    l(this.db.map(element => element[2]));
                });
        }
        else {
            this.db.push([Date.now() + this.timeout, identifier, elm]);
            if (this.listeners)
                this.listeners.forEach((l) => {
                    l(this.db.map(element => element[2]));
                });
        }
    }
    addUpdateListener(listener) {
        this.listeners = this.listeners || [];
        this.listeners.push(listener);
    }
    removeUpdateListener(listener) {
        if (this.listeners) {
            const index = this.listeners.indexOf(listener);
            if (index >= 0) {
                this.listeners.splice(index, 1);
            }
        }
    }
    pop() {
        const elm = this.db.pop();
        if (!this.db.length && this.nextGC) {
            clearTimeout(this.nextGC);
            this.nextGC = null;
        }
        return elm && elm[1];
    }
    shift() {
        var elm = this.db.shift();
        if (this.nextGC) {
            clearTimeout(this.nextGC);
            this.nextGC = null;
        }
        this.scheduleGC();
        return elm && elm[1];
    }
    all() {
        return this.db.map(function (elm) {
            return elm[1];
        });
    }
    /**
     * forwarded functions
     */
    forEach(fn, self) {
        this.db.forEach(function (elm, index) {
            fn.call(self, elm[1], index);
        });
    }
    map(fn, self) {
        return this.db.map(function (elm, index) {
            return fn.call(self, elm[1], index);
        });
    }
    every(fn, self) {
        return this.db.every(function (elm, index) {
            return fn.call(self, elm[1], index);
        });
    }
    some(fn, self) {
        return this.db.some(function (elm, index) {
            return fn.call(self, elm[1], index);
        });
    }
}
exports.AutoExpringArray = AutoExpringArray;
//# sourceMappingURL=AutoExpiringArray.js.map