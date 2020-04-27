import * as mockfs from "mock-fs";
import { Keys } from "../../src/lib/keys";
import * as fs from "fs";

describe("Keys", () => {

  beforeAll(() => {
    mockfs({
      "fake-dir": {
        "prev-keys.bin": "[[\"k\",99]]",
      }
    });
  });

  afterAll(() => {
    mockfs.restore();
  });

  it("should update and save keys", async () => {

    const underTest = new Keys("./fake-dir/keys.bin");

    await underTest.update("k", 99);

    const fileContent = await fs.promises.readFile("./fake-dir/keys.bin", "utf8");
    expect(await underTest.getPosition("k")).toBe(99);
    expect(fileContent).toEqual("[[\"k\",99]]");
  });

  it("should rebuild previous keys state", async () => {

    const underTest = new Keys("./fake-dir/prev-keys.bin");

    const fileContent = await fs.promises.readFile("./fake-dir/keys.bin", "utf8");
    expect(await underTest.getPosition("k")).toBe(99);
    expect(fileContent).toEqual("[[\"k\",99]]");
  });
});
