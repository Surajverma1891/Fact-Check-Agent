import "dotenv/config";

import { createHealthPayload } from "../server/http-handlers.js";

export default function handler(_request, response) {
  response.status(200).json(createHealthPayload());
}
