import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { compact } from "./compactor";
import { Log } from "./log";
import { JsonSerializer, Serializer } from "./serializer";

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

  keys(): string[];

  put(key: string, data: T): Promise<void>;

  get(key: string): Promise<Readonly<Result<T>> | undefined>;

  compact(): Promise<number>;

  iterator(): AsyncGenerator<Result<T>, void, unknown>;

  stream(): Readable;
}

export class FileSystemStorage<T> implements Storage<T> {

  static async create<T>(
    directory: string,
    serializer: Serializer = new JsonSerializer(),
  ): Promise<Storage<T>> {

    await this.ensureDir(directory);
    const log = await Log.create(path.join(directory, "./data"));
    const storage = new FileSystemStorage<T>(log, new Map(), serializer);
    await storage.rebuildKeys();
    return storage;
  }

  private constructor(
    private readonly log: Log,
    private keyMap: Map<string, number>,
    private readonly serializer: Serializer,
  ) { }

  keys(): string[] {
    return Array.from(this.keyMap.keys());
  }

  async put(key: string, object: T): Promise<void> {
    const buffer = this.serializer.serialize(object);
    const serializedMeta = this.serializer.serialize<Meta>({
      checksum: this.checksum(buffer),
      timestamp: Date.now(),
      key,
    });

    try {
      const offset = this.log.position;
      await this.log.write(buffer, serializedMeta);
      this.keyMap.set(key, offset);
    } catch (e) {
      console.error(`Error during PUT [key=${key}, data=${buffer.toString("utf8")}]`, e);
      throw (e);
    }
  }

  async get(key: string): Promise<Readonly<Result<T>> | undefined> {
    try {
      const position = this.keyMap.get(key);
      if (position === undefined) {
        return undefined;
      }
      const read = await this.log.read(position);
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

  async compact(): Promise<number> {
    const ms = await compact(this.log, (data) => this.serializer.deserialize<Meta>(data.metadata).key);
    await this.rebuildKeys();
    return ms;
  }

  private static async ensureDir(directory: string): Promise<void> {
    try {
      await fs.promises.mkdir(directory);
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw new Error(e);
      }
    }
  }

  stream(): Readable {
    return Readable.from(this.iterator());
  }

  async * iterator(): AsyncGenerator<Result<T>, void, unknown> {
    for (const key of this.keyMap.keys()) {
      const result = await this.get(key);
      if (result) {
        yield result;
      }
    }
  }

  private async rebuildKeys(): Promise<void> {
    const map = new Map<string, number>();

    let cursor = 0;
    const stat = await this.log.stat();

    while (cursor < stat.size) {
      const segment = await this.log.read(cursor);
      const meta = this.serializer.deserialize<Meta>(segment.metadata);
      map.set(meta.key, cursor);
      cursor += segment.bytesRead;
    }

    this.keyMap = map;
  }

  private checksum(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }
}
