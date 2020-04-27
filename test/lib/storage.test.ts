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

  it("Should create dir if doesn not exist", async () => {
    await FileSystemStorage.create("./i-not-exists");
    const stats = await fs.promises.stat("./i-not-exists");

    expect(stats.isDirectory()).toBeTruthy();
  });

  it("Should be able to write and read", async () => {

    const underTest = await FileSystemStorage.create("fake-dir");

    await underTest.put("k_a", Buffer.from("v_a"));
    await underTest.put("k_c", Buffer.from("v_c"));
    await underTest.put("k_b", Buffer.from("v_b"));

    expect(await underTest.get("k_c")).toEqual(Buffer.from("v_c"));
    expect(await underTest.get("k_a")).toEqual(Buffer.from("v_a"));
    expect(await underTest.get("k_b")).toEqual(Buffer.from("v_b"));

    const keysFileStat = await fs.promises.stat("./fake-dir/keys.bin");
    const dbFileStat = await fs.promises.stat("./fake-dir/db.bin");

    expect(keysFileStat.size).toBeGreaterThan(0);
    expect(dbFileStat.size).toBeGreaterThan(0);
  });
});
