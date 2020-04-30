import { FileSystemStorage } from "./lib/storage";

const cycles = 10000;

const items: string[] = [];
const pipeline: [string, string][] = [];

const randString = (chars: number): string => Math.random().toString(36).substring(chars);
const randEl = (): string => items[Math.floor(Math.random() * items.length)];

for (let i = 0; i < 1000; i++) {
  items.push(randString(5));
}

const main = async (): Promise<void> => {
  const storage = await FileSystemStorage.create<string>("./db");

  for (let i = 0; i < cycles; i++) {
    const v = randEl();
    pipeline.push([v, `v_${v}`]);
  }

  const start = process.hrtime();

  for (const [k, v] of pipeline) {
    await storage.put(k, v);
  }

  const [seconds, nanoseconds] = process.hrtime(start);
  const elapsed = Math.trunc(seconds * 1000 + nanoseconds / 1000000);
  console.log(`rand insert: ${elapsed}ms`);

  const start2 = process.hrtime();

  for (const [k] of pipeline) {
    await storage.get(k);
  }

  const [seconds2, nanoseconds2] = process.hrtime(start2);
  const elapsed2 = Math.trunc(seconds2 * 1000 + nanoseconds2 / 1000000);
  console.log(`rand get: ${elapsed2}ms`);

  console.log(`Compaction took: ${await storage.compact()}`);
};

main().then(() => console.log("finish"));
