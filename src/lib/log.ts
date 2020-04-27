import * as fs from "fs";

export class Log {

  static async create(path: string): Promise<Log> {
    const handler = await fs.promises.open(path, "a+");
    const stat = await handler.stat();
    return new Log(handler, stat.size);
  }

  private constructor(
    private readonly handler: fs.promises.FileHandle,
    private _position: number,
  ) { }

  get position(): number {
    return this._position;
  }

  async write(data: Buffer): Promise<number> {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(data.byteLength, 0);
    const buffer = Buffer.concat([lengthBuffer, data]);
    try {
      const writeResult = await this.handler.write(buffer);
      this._position += writeResult.bytesWritten;
      return writeResult.bytesWritten;
    } catch (e) {
      console.error(e);
      return 0;
    }
  }

  async buffer(position: number): Promise<Buffer> {
    try {
      const metadata = await this.handler.read(Buffer.allocUnsafe(4), 0, 4, position);
      if (metadata.bytesRead <= 0) {
        throw new Error(`No segment found at position [bytes=${position}]`);
      }
      const segmentLength = metadata.buffer.readUInt32LE(0);
      const data = await this.handler.read(Buffer.allocUnsafe(segmentLength), 0, segmentLength, position + 4);
      return data.buffer;
    } catch (e) {
      console.error(e);
      throw new Error(e);
    }
  }
}
