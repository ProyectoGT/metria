import { QueryClient } from "@tanstack/react-query";

const FIVE_MINUTES = 1000 * 60 * 5;
const TEN_MINUTES  = 1000 * 60 * 10;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            FIVE_MINUTES,
        gcTime:               TEN_MINUTES,
        refetchOnWindowFocus: true,
        retry:                2,
        retryDelay:           (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// In server contexts a new client is created per request.
// In browsers we reuse a single instance for the session lifetime.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
