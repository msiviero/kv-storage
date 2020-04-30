import { compact, KeySupplier } from "../../src/lib/compactor";
import { JsonSerializer } from "../../src/lib/serializer";
import { Meta } from "../../src/lib/storage";
import { Log } from "../../src/lib/log";
import * as fs from "fs";

describe("Compactor", () => {

  it("should compact log", async () => {

    const serializer = new JsonSerializer();

    const log = await Log.create("l.log");

    await log.write(
      Buffer.from("val1"),
      serializer.serialize<Meta>({ checksum: "1", timestamp: 0, key: "k1" })
    );

    await log.write(
      Buffer.from("val2"),
      serializer.serialize<Meta>({ checksum: "2", timestamp: 1, key: "k2" })
    );

    await log.write(
      Buffer.from("val3"),
      serializer.serialize<Meta>({ checksum: "3", timestamp: 2, key: "k2" })
    );

    const before = await fs.promises.stat(log.path);

    const supplier: KeySupplier<string> = (data) => {
      const meta = serializer.deserialize<Meta>(data.metadata);
      return meta.key;
    };

    const time = await compact(log, supplier);
    console.log(`Compacted log file in ${time}ms`);

    const after = await fs.promises.stat(log.path);

    expect(after.size).toBeLessThan(before.size);

    await log.write(
      Buffer.from("valx"),
      serializer.serialize<Meta>({ checksum: "4", timestamp: 3, key: "kx" })
    );

    const segment1 = await log.read(0);

    expect(serializer.deserialize(segment1.metadata)).toEqual({ checksum: "1", timestamp: 0, key: "k1" });
    expect(segment1.data.toString()).toEqual("val1");

    const segment2 = await log.read(segment1.bytesRead);

    expect(serializer.deserialize(segment2.metadata)).toEqual({ checksum: "3", timestamp: 2, key: "k2" });
    expect(segment2.data.toString()).toEqual("val3");

    const segment3 = await log.read(segment1.bytesRead + segment2.bytesRead);

    console.log(segment3.metadata.toString());


    expect(serializer.deserialize(segment3.metadata)).toEqual({ checksum: "4", timestamp: 3, key: "kx" });
    expect(segment3.data.toString()).toEqual("valx");
  });
});
