import * as path from "path";
import { Keys } from "./keys";
import { Log } from "./log";
import * as fs from "fs";

export interface Storage<T> {

  put(key: string, data: T): Promise<void> | void;

  get(key: string): Promise<T | undefined> | T | undefined;
}

export class FileSystemStorage implements Storage<Buffer> {

  static async create(directory: string): Promise<Storage<Buffer>> {
    try {
      await fs.promises.mkdir(directory);
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw new Error(e);
      }
    }
    const log = await Log.create(path.join(directory, "./db.bin"));
    const keys = new Keys(path.join(directory, "./keys.bin"));
    return new FileSystemStorage(log, keys);
  }

  private constructor(
    private readonly logWriter: Log,
    private readonly keys: Keys,
  ) { }

  async put(key: string, data: Buffer): Promise<void> {
    const startPosition = this.logWriter.position;
    try {
      await this.logWriter.write(data);
      await this.keys.update(key, startPosition);
    } catch (e) {
      console.error(e);
      throw (e);
    }
  }

  async get(key: string): Promise<Buffer | undefined> {
    try {
      const position = await this.keys.getPosition(key);
      return position != undefined ? this.logWriter.buffer(position) : undefined;
    } catch (e) {
      console.error(e);
      throw (e);
    }
  }
}
