---
layout: post
title: NATS JetStream ObjectStore with NodeJS/Typescript
date: 2024-06-12
categories: ["nats", "jetstream", "nodejs", "typescript"]
---

For an overview over the full series about NATS, see [NATS edge to cloud](/nats/edge/cloud/2024/06/11/nats-edge-to-cloud.html).

[NATS JetStream](https://docs.nats.io/nats-concepts/jetstream), the persistence layer of NATS, provides not only a way to store messages, but also a way to store other data via its [Object Store](https://docs.nats.io/nats-concepts/jetstream/obj_store). This blog post focuses on storing data in NATS in a NodeJS application.

Storing big files somewhere in NodeJS can be done by loading the whole file into memory and sending it somewhere or by streaming a file from one place to another. The latter approach is the more desirable one because it saves a lot of memory when dealing with big files. Good thing is, the NATS.js library favours the usage of streams: The methods to interact with it require `ReadableStream` and `WritableStream` typed arguments.

You can read more about it here:

- [NATS.js JetStream](https://github.com/nats-io/nats.deno/blob/main/jetstream.md)
- [MDN Streams > Using writable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_writable_streams)
- [MDN Streams > Using readable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)

## Storing a file in NATS JetStream Object Store

```typescript
import fs from "fs";

import { connect } from "nats";

export const readFileIntoReadableStream = (filePath: string) => {
  const readStream = fs.createReadStream(filePath);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      readStream.on("data", (chunk: Buffer) => {
        controller.enqueue(chunk);
      });

      readStream.on("end", () => {
        controller.close();
      });

      readStream.on("error", (error) => {
        controller.error(error);
      });
    },
  });
};

export const storeFile = async (
  fileName: string,
  filePath: string,
  objectStoreName: string,
) => {
  const natsConnection = await connect();

  const jetstream = natsConnection.jetstream();
  const objectStore = await jetstream.views.os(objectStoreName);
  const file = await objectStore.put(
    { name: fileName },
    readFileIntoReadableStream(filePath),
  );

  return file;
};
```

## Retrieving a file from NATS JetStream Object Store

```typescript
import fs from "fs";

import { connect } from "nats";

export const writableStreamForFile = (filePath: string) => {
  const writeStream = fs.createWriteStream(filePath);

  const writableStream = new WritableStream<Uint8Array>({
    write(chunk) {
      writeStream.write(chunk);
    },
    close() {
      writeStream.close();
    },
    abort(reason) {
      console.error(reason);
    },
  });

  return writableStream;
};

export const retrieveFile = async (
  natsName: string,
  filePath: string,
  objectStoreName: string,
) => {
  const natsConnection = await connect();

  const jetstream = natsConnection.jetstream();
  const objectStore = await jetstream.views.os(objectStoreName);
  const writeStream = writableStreamForFile(filePath);
  const natsFile = await objectStore.get(natsName);

  if (natsFile === null) {
    console.error(`File not found: ${objectStoreName} ${natsName}`);
    return
  }

  await natsFile.data.pipeTo(writeStream);
};
```
