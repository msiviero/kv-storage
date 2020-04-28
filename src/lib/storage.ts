import * as fs from "fs";
import * as path from "path";
import { Keys } from "./keys";
import { Log } from "./log";
import { Serializer, JsonSerializer } from "./serializer";
import * as crc32c from "fast-crc32c";

export interface Meta {
  checksum: number;
  timestamp: number;
  key: string;
}

export interface Result<T> {
  meta: Meta;
  data: T;
}

export interface Storage<T> {

  put(key: string, data: T): Promise<void>;

  get(key: string): Promise<T | undefined>;
}

export class FileSystemStorage implements Storage<Buffer> {

  static async create(
    directory: string,
    serializer: Serializer = new JsonSerializer(),
  ): Promise<Storage<Buffer>> {

    try {
      await fs.promises.mkdir(directory);
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw new Error(e);
      }
    }
    const log = await Log.create(path.join(directory, "./db.bin"));
    const keys = new Keys(path.join(directory, "./keys.bin"));
    return new FileSystemStorage(log, keys, serializer);
  }

  private constructor(
    private readonly logWriter: Log,
    private readonly keys: Keys,
    private readonly serializer: Serializer,
  ) { }

  async put(key: string, buffer: Buffer): Promise<void> {
    const startPosition = this.logWriter.position;

    const meta: Meta = {
      checksum: crc32c.calculate(buffer),
      timestamp: Date.now(),
      key,
    };

    const serializedMeta = this.serializer.serialize(meta);
    try {
      await this.logWriter.write(buffer, serializedMeta);
      await this.keys.update(key, startPosition);
    } catch (e) {
      console.error(`Error during PUT [key=${key}, data=${buffer.toString("utf8")}]`, e);
      throw (e);
    }
  }

  async get(key: string): Promise<Buffer | undefined> {
    try {
      const position = this.keys.getPosition(key);
      if (position === undefined) {
        return undefined;
      }
      const read = await this.logWriter.read(position);
      const meta = this.serializer.deserialize<Meta>(read.metadata);
      const checksum = crc32c.calculate(read.data);


      if (meta.checksum !== checksum) {
        console.error(`Calculated checksum different from metadata [original=${meta.checksum} calculated=${checksum}]`);
        return undefined;
      }

      return read.data;
    } catch (e) {
      console.error(`Error during GET [key=${key}]`, e);
      throw (e);
    }
  }
}
