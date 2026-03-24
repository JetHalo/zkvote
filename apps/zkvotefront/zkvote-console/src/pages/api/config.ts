import type { NextApiRequest, NextApiResponse } from "next";
import { getPublicAppConfig } from "@/server/env";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ config: getPublicAppConfig() });
}
