import { httpRouter } from "convex/server";
import { ingestHttp } from "./sensorReadings";

const http = httpRouter();

http.route({
  path: "/ingest",
  method: "POST",
  handler: ingestHttp,
});

export default http;
