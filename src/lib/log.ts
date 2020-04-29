import * as fs from "fs";

export class Log {

  private writes = 0;

  static async create(path: string, threshold = 10000): Promise<Log> {
    const handler = await fs.promises.open(path, "as+");
    const stat = await handler.stat();
    return new Log(handler, path, threshold, stat.size);
  }

  private constructor(
    private readonly handler: fs.promises.FileHandle,
    private readonly _path: string,
    private readonly threshold: number,
    private _position: number,
  ) { }

  get position(): number {
    return this._position;
  }

  get path(): string {
    return this._path;
  }

  close(): Promise<void> {
    return this.handler.close();
  }

  stat(): Promise<fs.Stats> {
    return this.handler.stat();
  }

  async write(data: Buffer, metadata: Buffer = Buffer.from("")): Promise<number> {

    if (this.writes >= this.threshold) {
      this.writes = 0;
      this.compact(this._path);
    }

    if (!Buffer.isBuffer(data)) {
      throw new Error(`Data is not a buffer. [arg=${data}]`);
    }
    if (!Buffer.isBuffer(metadata)) {
      throw new Error(`Metadata is not a buffer. [arg=${metadata}]`);
    }

    const header = Buffer.alloc(8);
    header.writeUInt32LE(data.byteLength, 0);
    header.writeUInt32LE(metadata.byteLength, 4);

    const buffer = Buffer.concat([header, metadata, data, Buffer.from([0xC0, 0x80])]);

    try {
      const writeResult = await this.handler.write(buffer);
      this._position += writeResult.bytesWritten;
      this.writes++;
      return writeResult.bytesWritten;
    } catch (e) {
      console.error("Error while writing to filesystem log", e);
      return 0;
    }
  }

  async read(position: number): Promise<Readonly<Data>> {
    try {
      const header = await this.handler.read(Buffer.allocUnsafe(8), 0, 8, position);
      const dataLength = header.buffer.slice(0, 4).readUInt32LE(0);
      const metadataLength = header.buffer.slice(4, 8).readUInt32LE(0);
      const length = dataLength + metadataLength + 2;

      const segment = await this.handler.read(Buffer.allocUnsafe(length), 0, length, position + 8);
      const controlCharacter = segment.buffer.slice(length - 2, length);

      if (Buffer.compare(controlCharacter, Buffer.from([0xC0, 0x80])) !== 0) {
        throw new Error(`Control characted not found in segment at position ${position}`);
      }

      return {
        metadata: segment.buffer.slice(0, metadataLength),
        data: segment.buffer.slice(metadataLength, metadataLength + dataLength),
      };
    } catch (e) {
      console.error("Error while reading from filesystem log", e);
      throw new Error(e);
    }
  }

  private async compact(path: string): Promise<void> {

    console.log("compact");

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

      const metadata = segment.buffer.slice(metadataLength, metadataLength + dataLength).toString("utf8");
      const data = segment.buffer.slice(0, metadataLength).readUInt32LE(0);

      if (cursor < 0) console.log(metadata, data);

      cursor += length + 8;
    }
  }
}

export interface Data {
  data: Buffer;
  metadata: Buffer;
}
