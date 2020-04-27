import * as mockfs from "mock-fs";
import { Log } from "../../src/lib/log";
import * as fs from "fs";


describe("LogWriter", () => {

  beforeAll(() => {
    mockfs({
      "fake-dir": {
        "test-append-log.bin": "1234567890\n",
      }
    });
  });

  afterAll(() => {
    mockfs.restore();
  });

  it("can add segment to log file", async () => {
    const underTest = await Log.create("./fake-dir/add-segment.bin");

    let written = 0;

    written += await underTest.write(Buffer.from("xxx"));
    written += await underTest.write(Buffer.from("yyy"));

    await fs.promises.readFile("./fake-dir/add-segment.bin");

    expect(written).toEqual(14);
  });

  it("can read previuos state from filesystem", async () => {
    const firstlogger = await Log.create("./fake-dir/prev-state.bin");

    await firstlogger.write(Buffer.from("xxx"));
    await firstlogger.write(Buffer.from("yyy"));
    const statsFirstStep = await fs.promises.stat("./fake-dir/prev-state.bin");

    const underTest = await Log.create("./fake-dir/prev-state.bin");
    await underTest.write(Buffer.from("zzz"));

    const statsSecondStep = await fs.promises.stat("./fake-dir/prev-state.bin");
    expect(statsSecondStep.size).toBeGreaterThan(statsFirstStep.size);
  });

  it("test append log to prev file", async () => {
    const underTest = await Log.create("./fake-dir/test-append-log.bin");
    expect(underTest.position).toEqual(11);
    await underTest.write(Buffer.from("xxxxx"));
    expect(underTest.position).toEqual(20);
  });
});
