import * as mockfs from "mock-fs";
import { Log } from "../../src/lib/log";


describe("LogWriter", () => {

  beforeAll(() => {
    mockfs({
      "fake-dir": {
        "test-append-log": "1234567890\n",
      }
    });
  });

  afterAll(() => {
    mockfs.restore();
  });

  test("can append segment to log file and read it if offset is known", async () => {
    const underTest = await Log.create("./fake-dir/append-segment");

    const offset = await underTest.write(Buffer.from("xxx"), Buffer.from("m"));
    await underTest.write(Buffer.from("yyy"));

    const actual = await underTest.read(0);
    expect(actual.data).toEqual(Buffer.from("xxx"));
    expect(actual.metadata).toEqual(Buffer.from("m"));

    const actual2 = await underTest.read(offset);
    expect(actual2.data).toEqual(Buffer.from("yyy"));
    expect(actual2.metadata).toEqual(Buffer.alloc(0));
  });

  test("test append log to prev file", async () => {
    const underTest = await Log.create("./fake-dir/test-append-log");
    const initialOffset = (await underTest.stat()).size;

    expect(initialOffset).toBeGreaterThan(0);

    await underTest.write(Buffer.from("xxx"), Buffer.from("m"));

    const actual = await underTest.read(initialOffset);

    expect(actual.data).toEqual(Buffer.from("xxx"));
    expect(actual.metadata).toEqual(Buffer.from("m"));
  });

  test("Should compact log after configured writes", async () => {
    const underTest = await Log.create("./fake-dir/test-compaction", 10);

    await underTest.write(Buffer.from("a"));
    await underTest.write(Buffer.from("b"));
    await underTest.write(Buffer.from("c"));

    fail("not yet implemented");
  });
});
