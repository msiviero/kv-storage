import { Log, Data } from "./log";
import * as fs from "fs";

export type KeySupplier<T = unknown> = (segment: Data) => T;

export const compact = async <T>(log: Log, keySupplier: KeySupplier<T>): Promise<number> => {
  const start = process.hrtime();
  const stats = await fs.promises.stat(log.path);

  let position = 0;

  const map = new Map<T, Data>();

  while (position < stats.size) {
    const segment = await log.read(position);
    const key = keySupplier(segment);

    map.set(key, segment);
    position += segment.bytesRead;
  }

  const newLog = await Log.create(log.path + ".tmp");

  for (const segment of map.values()) {
    await newLog.write(segment.data, segment.metadata);
  }
  await newLog.close();
  await fs.promises.rename(log.path + ".tmp", log.path);
  await log.refresh();

  const [secs, nsecs] = process.hrtime(start);
  return Math.trunc(secs * 1000 + nsecs / 1000000);
};
