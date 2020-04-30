import * as fs from "fs";
import * as path from "path";
import { Keys } from "./keys";
import { Log } from "./log";
import { JsonSerializer, Serializer } from "./serializer";
import * as crypto from "crypto";

export interface Meta {
  checksum: string;
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
    serializer: Serializer = new JsonSerializer(),
  ): Promise<Storage<T>> {

    try {
      await fs.promises.mkdir(directory);
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw new Error(e);
      }
    }

    const [log, keys]: [Log, Keys] = await Promise.all([
      Log.create(path.join(directory, "./data")),
      Keys.create(path.join(directory, "./keys")),
    ]);

    return new FileSystemStorage(log, keys, serializer);
  }

  private constructor(
    private readonly logWriter: Log,
    private readonly keys: Keys,
    private readonly serializer: Serializer,
  ) { }

  async put(key: string, object: T): Promise<void> {
    const buffer = this.serializer.serialize(object);
    const meta: Meta = {
      checksum: this.checksum(buffer),
      timestamp: Date.now(),
      key,
    };

    const serializedMeta = this.serializer.serialize(meta);
    try {
      const written = await this.logWriter.write(buffer, serializedMeta);
      await this.keys.update(key, this.logWriter.position - written);
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
      const checksum = this.checksum(read.data);

      if (meta.checksum !== checksum) {
        console.error(`Calculated checksum different from metadata [original=${meta.checksum} calculated=${checksum}]`);
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

  private checksum(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }
}
