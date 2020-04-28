import * as crc32c from "fast-crc32c";
import * as fs from "fs";
import * as path from "path";
import { Keys } from "./keys";
import { Log } from "./log";
import { MsgPackSerializer, Serializer } from "./serializer";

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

  get(key: string): Promise<Readonly<Result<T>> | undefined>;
}

export class FileSystemStorage<T> implements Storage<T> {

  static async create<T>(
    directory: string,
    serializer: Serializer = new MsgPackSerializer(),
  ): Promise<Storage<T>> {

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

  async put(key: string, object: T): Promise<void> {
    const startPosition = this.logWriter.position;
    const buffer = this.serializer.serialize(object);

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

  async get(key: string): Promise<Readonly<Result<T>> | undefined> {

    try {
      const position = this.keys.getPosition(key);
      if (position === undefined) {
        return undefined;
      }
      const read = await this.logWriter.read(position);
      const meta = this.serializer.deserialize<Meta>(read.metadata);
      const crc32 = crc32c.calculate(read.data);

      if (meta.checksum !== crc32) {
        console.error(`Calculated checksum different from metadata [original=${meta.checksum} calculated=${crc32}]`);
        return undefined;
      }
      return {
        data: this.serializer.deserialize(read.data),
        meta,
      };
    } catch (e) {
      console.error(`Error during GET [key=${key}]`, e);
      throw (e);
    }
  }
}
