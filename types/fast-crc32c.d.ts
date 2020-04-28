
declare module "fast-crc32c" {
  function calculate(data: string | Buffer, initial?: number): number;
}
