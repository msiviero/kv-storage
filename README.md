# KV Storage

> A simple on disk key value storage for nodejs
---

## Description

The implementation is done using an append only log where every value is stored in binary format and the keys are pointers to disk segments,
similar to the bitcask engine, so the keys should fit in memory.

## Installation

```shellscript
npm i @msiviero/kv-storage
```

## Usage

- [Basic usage](#basic-usage)
- [Log compaction](#log-compaction)
- [Iterate records](#iterate-records)

### Basic usage

```typescript

import { FileSystemStorage } from "@msiviero/kv-storage";

interface User {
  email: string;
  id: number;
}

// create a store. The directory will be created if doesn't exist
const storage = await FileSystemStorage.create<User>("directory to store data in");

await storage.put("mykey", {
  id: 1,
  email: "user@example.com",
});

/*
The result contains the stored data in the .data field, and a
metadata object containing:
- checksum: an md5 checksum of the stored buffer
- timestamp: timestamp of insertion
- key: the original key
*/
const result = await storage.get("mykey");

const user = result?.data;

```

### Log compaction

The log compaction logic is left to the user, as it's different based on the application. To compact the log call the compact() method

```typescript

await storage.compact();

```

### Iterate records

```typescript

// Using an async generator
for await (const it of storage.iterator()) {
 // do something with the record
 console.log(it);
}

// using a stream
storage
  .stream()
  .on("data", (result: Readonly<Result<User>>) => console.log(result))
  .on("end", () => console.log("finished"));

```
