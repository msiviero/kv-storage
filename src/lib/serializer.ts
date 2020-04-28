

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
