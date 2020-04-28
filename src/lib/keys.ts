import * as fs from "fs";

export class Keys {

  private readonly keysMap: Map<string, number>;

  public static async create(filePath: string): Promise<Keys> {
    const content = await fs.promises.readFile(filePath, "utf8");
    return new Keys(filePath, JSON.parse(content));
  }

  constructor(private readonly filePath: string, keys: [string, number][] = []) {
    this.keysMap = new Map(keys);
  }

  async update(key: string, startPosition: number): Promise<void> {
    const current = this.keysMap.get(key);
    this.keysMap.set(key, startPosition);

    try {
      await this.save();
    } catch (e) {
      if (current != undefined) {
        this.keysMap.set(key, current);
      }
      throw (e);
    }
  }

  getPosition(key: string): number | undefined {
    return this.keysMap.get(key);
  }

  entries(): IterableIterator<[string, number]> {
    return this.keysMap.entries();
  }

  private async save(): Promise<void> {
    return fs.promises.writeFile(this.filePath, this.serialize());
  }

  private serialize(): string {
    return JSON.stringify([...this.keysMap.entries()]);
  }
}
