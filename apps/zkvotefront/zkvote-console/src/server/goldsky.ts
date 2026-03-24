import { getServerEnv } from "@/server/env";

export interface GoldskyClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export function createGoldskyClientFromEnv(): GoldskyClient | null {
  const env = getServerEnv();
  if (!env.GOLDSKY_SUBGRAPH_URL) {
    return null;
  }

  return {
    async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (env.GOLDSKY_API_KEY) {
        headers.Authorization = `Bearer ${env.GOLDSKY_API_KEY}`;
      }

      const response = await fetch(env.GOLDSKY_SUBGRAPH_URL!, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`GOLDSKY_QUERY_FAILED_${response.status}`);
      }

      const body = (await response.json()) as {
        data?: T;
        errors?: Array<{ message?: string }>;
      };

      if (body.errors?.length) {
        throw new Error(body.errors[0]?.message || "GOLDSKY_QUERY_FAILED");
      }

      if (!body.data) {
        throw new Error("GOLDSKY_RESPONSE_EMPTY");
      }

      return body.data;
    }
  };
}
