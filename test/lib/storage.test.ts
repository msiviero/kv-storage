import { FileSystemStorage } from "../../src/lib/storage";
import * as mockfs from "mock-fs";
import * as fs from "fs";

describe("Storage", () => {

  beforeAll(() => {
    mockfs({
      "fake-dir": {}
    });
  });

  afterAll(() => {
    mockfs.restore();
  });

  test("Should create dir if doesn not exist", async () => {
    await FileSystemStorage.create("./i-not-exists");
    const stats = await fs.promises.stat("./i-not-exists");

    expect(stats.isDirectory()).toBeTruthy();
  });

  test("Should be able to write and read", async () => {

    const underTest = await FileSystemStorage.create("fake-dir");

    await underTest.put("k_a", Buffer.from("v_a"));
    await underTest.put("k_c", Buffer.from("v_c"));

    const resC = await underTest.get("k_c");
    const resA = await underTest.get("k_a");
    const resB = await underTest.get("k_b");

    expect(resB).toBeUndefined();

    if (resA === undefined || resC === undefined) {
      throw new Error("undefined value");
    }

    expect(resC.data).toEqual(Buffer.from("v_c"));
    expect(resC.meta.key).toEqual("k_c");
    expect(resC.meta.timestamp).toBeLessThan(Date.now());

    expect(resA.data).toEqual(Buffer.from("v_a"));
    expect(resA.meta.key).toEqual("k_a");
    expect(resA.meta.timestamp).toBeLessThan(Date.now());

    const keysFileStat = await fs.promises.stat("./fake-dir/keys.bin");
    const dbFileStat = await fs.promises.stat("./fake-dir/db.bin");

    expect(keysFileStat.size).toBeGreaterThan(0);
    expect(dbFileStat.size).toBeGreaterThan(0);
  });
});
