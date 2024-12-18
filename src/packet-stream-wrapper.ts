import { Buffer } from "node:buffer";
import type { TLSSocket } from "node:tls";

import { EventEmitter } from "@denosaurs/event";
import type { PacketStreamWrapperEvents } from "./types.ts";

const WAITING_HEADER = 0;
const WAITING_PACKET = 1;

export class PacketStreamWrapper
  extends EventEmitter<PacketStreamWrapperEvents> {
  stream: TLSSocket;
  state: number;
  packetLength: number;

  constructor(stream: TLSSocket) {
    super();

    this.stream = stream;

    this.state = WAITING_HEADER;
    this.packetLength = 0;

    this.stream.on("readable", () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        switch (this.state) {
          case WAITING_HEADER: {
            const header = stream.read(4);
            if (header === null) return;
            this.packetLength = header.readUInt32BE(0);
            this.state = WAITING_PACKET;
            break;
          }
          case WAITING_PACKET: {
            const packet = stream.read(this.packetLength);
            if (packet === null) return;
            this.emit("packet", packet);
            this.state = WAITING_HEADER;
            break;
          }
        }
      }
    });
  }

  send(buf: Uint8Array) {
    const header = Buffer.alloc(4);
    header.writeUInt32BE(buf.length, 0);
    const arr: Uint8Array = new Uint8Array(header);
    const newBuf = new Uint8Array(arr.length + buf.length);
    newBuf.set(arr);
    newBuf.set(buf, arr.length);
    this.stream.write(newBuf);
  }
}
