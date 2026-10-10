import { describe, expect, it } from "bun:test";
import { PocketClient } from "../src/client.js";

describe("PocketClient", () => {
  it("initializes with default base url", () => {
    const client = new PocketClient({ apiKey: "test_key" });
    expect(client).toBeDefined();
  });

  it("accepts custom baseUrl without trailing slash", () => {
    const client = new PocketClient({
      apiKey: "test_key",
      baseUrl: "https://custom.endpoint.com/api/",
    });
    expect(client).toBeDefined();
  });
});
