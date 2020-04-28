import * as msgpack from "msgpack-lite";

export interface Serializer {
  serialize<T>(object: T): Buffer;
  deserialize<T>(data: Buffer): T;
}

export class JsonSerializer implements Serializer {

  serialize<T>(object: T): Buffer {
    return Buffer.from(JSON.stringify(object));
  }

  deserialize<T>(data: Buffer): T {
    return JSON.parse(data.toString("utf8"));
  }
}

export class MsgPackSerializer implements Serializer {

  serialize<T>(object: T): Buffer {
    return msgpack.encode(object);
  }
  deserialize<T>(data: Buffer): T {
    return msgpack.decode(data);
  }
}
