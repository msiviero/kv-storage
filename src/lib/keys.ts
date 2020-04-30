import * as fs from "fs";
import { Log } from "./log";

export class Keys {

  private readonly _keys: Map<string, number>;

  public static async create(path: string): Promise<Keys> {
    const log = await Log.create(path);
    const it = Keys.loadPreviousState(path);
    const keys: { [k: string]: number } = {};

    for await (const [k, v] of it) {
      keys[k] = v;
    }
    return new Keys(log, Object.entries(keys));
  }

  private constructor(private readonly log: Log, keys: [string, number][] = []) {
    this._keys = new Map(keys);
  }

  async update(key: string, position: number): Promise<void> {

    this._keys.set(key, position);
    const positionBuffer = Buffer.alloc(4);
    positionBuffer.writeUInt32LE(position, 0);
    await this.log.write(Buffer.from(key), positionBuffer);
  }

  getPosition(key: string): number | undefined {
    return this._keys.get(key);
  }

  entries(): IterableIterator<[string, number]> {
    return this._keys.entries();
  }

  keys(): IterableIterator<string> {
    return this._keys.keys();
  }

  size(): number {
    return this._keys.size;
  }

  close(): Promise<void> {
    return this.log.close();
  }

  private static async *loadPreviousState(path: string): AsyncGenerator<[string, number], [string, number][], void> {
    const acc: { [k: string]: number } = {};
    const fh = await fs.promises.open(path, "r");

    let cursor = 0;
    let finished = false;

    while (!finished) {
      const header = await fh.read(Buffer.allocUnsafe(8), 0, 8, cursor);
      if (header.bytesRead <= 0) {
        await fh.close();
        finished = true;
        break;
      }

      const dataLength = header.buffer.slice(0, 4).readUInt32LE(0);
      const metadataLength = header.buffer.slice(4, 8).readUInt32LE(0);
      const length = dataLength + metadataLength + 2;

      const segment = await fh.read(Buffer.allocUnsafe(length), 0, length, cursor + 8);
      const controlCharacter = segment.buffer.slice(length - 2, length);

      if (Buffer.compare(controlCharacter, Buffer.from([0xC0, 0x80])) !== 0) {
        throw new Error(`Control characted not found in segment at position ${cursor}`);
      }

      const key = segment.buffer.slice(metadataLength, metadataLength + dataLength).toString("utf8");
      const position = segment.buffer.slice(0, metadataLength).readUInt32LE(0);

      yield [key, position];
      cursor += length + 8;
    }
    return Object.entries(acc);
  }
}
