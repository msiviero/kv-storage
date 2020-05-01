import * as fs from "fs";
import * as mockfs from "mock-fs";
import { FileSystemStorage, Result } from "../../src/lib/storage";


describe("Storage", () => {

  beforeAll(() => {
    mockfs({
      "fake-dir": {}
    });
  });

  afterAll(() => {
    mockfs.restore();
  });

  test("Should be able to write and read", async () => {

    const underTest = await FileSystemStorage.create("fake-dir");

    interface User {
      id: number;
      email: string;
    }

    const objectA: User = { id: 1, email: "user1@example.org" };
    const objectB: User = { id: 1, email: "user1@example.org" };

    await underTest.put("k_a", objectA);
    await underTest.put("k_c", objectB);

    const resC = await underTest.get("k_c");
    const resA = await underTest.get("k_a");
    const resB = await underTest.get("k_b");

    expect(resB).toBeUndefined();

    if (resA === undefined || resC === undefined) {
      throw new Error("undefined value");
    }

    expect(resC.data).toEqual(objectB);
    expect(resC.meta.key).toEqual("k_c");
    expect(resC.meta.timestamp).toBeLessThan(Date.now());

    expect(resA.data).toEqual(objectA);
    expect(resA.meta.key).toEqual("k_a");
    expect(resA.meta.timestamp).toBeLessThan(Date.now());

    const dbFileStat = await fs.promises.stat("./fake-dir/data");

    expect(dbFileStat.size).toBeGreaterThan(0);
  });

  test("Should create dir if does not exist", async () => {
    await FileSystemStorage.create("./i-not-exists");
    const stats = await fs.promises.stat("./i-not-exists");

    expect(stats.isDirectory()).toBeTruthy();
  });

  test("Should keep consistency while compacting logs", async () => {
    const underTest = await FileSystemStorage.create<string>("./log-compact-test");

    await underTest.put("k1", "v1.0");
    await underTest.put("k2", "v2.0");
    await underTest.put("k2", "v2.1");
    await underTest.put("k1", "v1.1");

    await underTest.compact();

    await underTest.put("k3", "v3.0");

    expect((await underTest.get("k1"))?.data).toEqual("v1.1");
    expect((await underTest.get("k2"))?.data).toEqual("v2.1");
    expect((await underTest.get("k3"))?.data).toEqual("v3.0");
  });

  test("Should have an iterator for the results", async () => {

    const underTest = await FileSystemStorage.create<string>("./iterator-test");

    await underTest.put("k1", "v1.0");
    await underTest.put("k2", "v2.0");
    await underTest.put("k2", "v2.1");
    await underTest.put("k1", "v1.1");

    const results: Result<string>[] = [];

    for await (const it of underTest.iterator()) {
      results.push(it);
    }

    expect(results.map(r => [r.meta.key, r.data])).toEqual([
      ["k1", "v1.1"],
      ["k2", "v2.1"],
    ]);
  });

  test("Should stream results", async (done) => {

    const underTest = await FileSystemStorage.create<string>("./stream-test");

    await underTest.put("k1", "v1.0");
    await underTest.put("k2", "v2.0");
    await underTest.put("k2", "v2.1");
    await underTest.put("k1", "v1.1");

    const results: Result<string>[] = [];

    underTest
      .stream()
      .on("data", (result: Result<string>) => results.push(result))
      .on("end", () => {
        expect(results.map(r => [r.meta.key, r.data])).toEqual([
          ["k1", "v1.1"],
          ["k2", "v2.1"],
        ]);
        done();
      });
  });
});
