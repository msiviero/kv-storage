import * as fs from "fs";

export class Keys {

  private readonly keysMap = new Map<string, number>();

  public static async create(filePath: string): Promise<Keys> {
    const content = await fs.promises.readFile(filePath, "utf8");
    return new Keys(filePath, JSON.parse(content));
  }

  private constructor(private readonly filePath: string) { }

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

  async getPosition(key: string): Promise<number | undefined> {
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
