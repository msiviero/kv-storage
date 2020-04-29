import * as mockfs from "mock-fs";
import { Keys } from "../../src/lib/keys";

describe("Keys", () => {

  beforeAll(() => {
    mockfs({
      "fake-dir": {}
    });
  });

  afterAll(() => {
    mockfs.restore();
  });

  test("should update and save keys", async () => {

    const underTest = await Keys.create("./fake-dir/keys");

    await underTest.update("k", 99);

    expect(underTest.getPosition("k")).toBe(99);
  });

  test("should rebuild previous keys state", async () => {

    const keys = await Keys.create("./fake-dir/prev-keys");

    await keys.update("a", 1);
    await keys.update("b", 2);
    await keys.update("c", 3);

    await keys.close();

    const underTest = await Keys.create("./fake-dir/prev-keys");

    expect(underTest.size()).toBe(3);
  });
});
