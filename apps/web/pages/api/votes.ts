import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "@/lib/store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const store = getStore();
  return res.status(200).json({ votes: store.votes });
}
