export class AutoExpringArray {
  private timeout: number;
  private db: any[];
  private nextGC: null | NodeJS.Timeout = null;
  private delay: number = 5; // ms delay to wait before scheduling a GC after an element should be cleared
  private isNonRedundant: boolean;
  private listeners: any;
  constructor(timeout: number, nonRedundant: boolean) {
    if (!Number.isFinite(timeout)) throw new Error("Timeout must be a number");
    this.timeout = timeout;
    this.db = [];
    this.isNonRedundant = nonRedundant;
    this.listeners = [];
  }

  private scheduleGC() {
    if (this.nextGC) return;
    const ts = this.db.length ? this.db[0][0] - Date.now() + this.delay : this.timeout;
    this.nextGC = setTimeout(this.gc.bind(this), ts);
    if (this.nextGC.unref) this.nextGC.unref();
  }

  private gc() {
    const now = Date.now();
    while (this.db.length && this.db[0][0] < now) {
      this.db.shift();
    }
    this.nextGC = null;
    this.scheduleGC();
  }

  public push(elm: any, identifier?: string) {
    if (!this.db.length) this.scheduleGC();
    if (this.isNonRedundant && identifier == undefined)
      throw new Error("Identifier cant be null if the array is non-redundant");
    if (this.isNonRedundant) {
      const idx = this.db.findIndex((value, _) => {
        return value[1] === identifier;
      });
      if (idx != -1) {
        this.db[idx] = [Date.now() + this.timeout, identifier, elm];
      } else {
        this.db.push([Date.now() + this.timeout, identifier, elm]);
      }
      if (this.listeners)
        this.listeners.forEach((l: (arg: any) => void) => {
          l(this.db.map(element => element[2]));
        });
    } else {
      this.db.push([Date.now() + this.timeout, identifier, elm]);
      if (this.listeners)
      this.listeners.forEach((l: (arg: any) => void) => {
        l(this.db.map(element => element[2]));
      });
    }
  }

  public addUpdateListener(listener: any) {
    this.listeners = this.listeners || [];
    this.listeners.push(listener);
  }

  public removeUpdateListener(listener: any) {
    if (this.listeners) {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    }
  }

  public pop() {
    const elm = this.db.pop();
    if (!this.db.length && this.nextGC) {
      clearTimeout(this.nextGC);
      this.nextGC = null;
    }
    return elm && elm[1];
  }

  public shift() {
    var elm = this.db.shift();
    if (this.nextGC) {
      clearTimeout(this.nextGC);
      this.nextGC = null;
    }
    this.scheduleGC();
    return elm && elm[1];
  }

  public all() {
    return this.db.map(function(elm) {
      return elm[1];
    });
  }

  /**
   * forwarded functions
   */

  public forEach(fn: any, self: any) {
    this.db.forEach(function(elm, index) {
      fn.call(self, elm[1], index);
    });
  }

  public map(fn: any, self: any) {
    return this.db.map(function(elm, index) {
      return fn.call(self, elm[1], index);
    });
  }

  public every(fn: any, self: any) {
    return this.db.every(function(elm, index) {
      return fn.call(self, elm[1], index);
    });
  }

  public some(fn: any, self: any) {
    return this.db.some(function(elm, index) {
      return fn.call(self, elm[1], index);
    });
  }
}
