import { Request, Response } from "express";
import { getPlace } from "./couchBase";

export default {
  path: "/api/v1/geojson",
  method: "get",
  handler: [
    async ({ query }: Request, res: Response) => {
      const result = await getPlace(query.q);
      res.status(200).send(result);
    }
  ]
};
