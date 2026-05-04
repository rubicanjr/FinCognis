import "@testing-library/jest-dom/vitest";

process.env.UPSTASH_REDIS_REST_URL ??= "https://upstash.example.local";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "test-token";
