import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "@/lib/csv";

describe("csv helpers", () => {
  it("round-trips basic rows", () => {
    const csv = toCsv(
      ["name", "note"],
      [{ name: "Alice", note: 'hello, "world"' }],
    );
    const rows = parseCsv(csv);
    expect(rows).toEqual([{ name: "Alice", note: 'hello, "world"' }]);
  });
});
