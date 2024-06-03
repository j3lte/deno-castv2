import { Buffer } from "node:buffer";
import { connect, type TLSSocket } from "node:tls";

import { EventEmitter } from "@denosaurs/event";
import { Message } from "protobufjs";

import { Channel } from "./channel.ts";
import { PacketStreamWrapper } from "./packet-stream-wrapper.ts";
import getMessages from "./proto.ts";
import type {
  ClientConnectOptions,
  ClientEventTypes,
  SendMessage,
} from "./types.ts";

const CastMessage = getMessages().CastMessage;

/**
 * CastV2 client
 *
 * Connects to a CastV2 server and sends/receives messages
 *
 * @emits connect - when the client is connected
 * @emits close - when the client is closed
 * @emits error - when an error occurs
 * @emits message - when a message is received
 */
export class Client extends EventEmitter<ClientEventTypes> {
  socket: TLSSocket | null = null;
  ps: PacketStreamWrapper | null = null;

  constructor() {
    super();
  }

  /**
   * Connect to a CastV2 server
   *
   * @param options {string | ClientConnectOptions} - host or options
   * @param callback {() => void} - callback when connected
   */
  connect(options: string | ClientConnectOptions, callback?: () => void) {
    const opts = typeof options === "string" ? { host: options } : options;
    opts.port = opts.port || 8009;
    opts.rejectUnauthorized = false;

    if (callback) {
      this.once("connect", callback);
    }

    const onpacket = (buf: Buffer) => {
      const message = CastMessage.parse(buf) as SendMessage & Message;

      if (message.protocolVersion !== 0) {
        // CASTV2_1_0
        this.emit(
          "error",
          new Error("Unsupported protocol version: " + message.protocolVersion),
        );
        this.close();
        return;
      }

      this.emit(
        "message",
        message.sourceId,
        message.destinationId,
        message.namespace,
        message.payloadType === 1 // BINARY
          ? message.payloadBinary
          : message.payloadUtf8,
      );
    };

    const onerror = (err: Error) => {
      this.emit("error", err);
    };

    const onclose = () => {
      this.socket!.removeListener("error", onerror);
      this.socket = null;
      if (this.ps) {
        this.ps.off("packet", onpacket);
        this.ps = null;
      }
      this.emit("close");
    };

    this.socket = connect(opts, () => {
      this.ps = new PacketStreamWrapper(this.socket!);
      this.ps.on("packet", onpacket);

      this.emit("connect");
    });

    this.socket.on("error", onerror);
    this.socket.once("close", onclose);
  }

  /**
   * Close the connection
   */
  close() {
    // using socket.destroy here because socket.end caused stalled connection
    // in case of dongles going brutally down without a chance to FIN/ACK
    this.socket!.destroy();
  }

  /**
   * Send a message to the server
   *
   * @param sourceId {string} - source id
   * @param destinationId {string} - destination id
   * @param namespace {string} - namespace
   * @param data {Buffer | string} - data to send
   */
  send(
    sourceId: string,
    destinationId: string,
    namespace: string,
    data: Buffer | string,
  ) {
    const payLoadType = Buffer.isBuffer(data) ? 1 : 0;
    const message: SendMessage = {
      protocolVersion: 0, // CASTV2_1_0
      sourceId: sourceId,
      destinationId: destinationId,
      namespace: namespace,
      payloadType: payLoadType,
    };

    if (Buffer.isBuffer(data)) {
      message.payloadBinary = data;
    } else {
      message.payloadUtf8 = data;
    }

    const buf = CastMessage.serialize(new Message(message));
    this.ps!.send(buf);
  }

  /**
   * Create a channel
   *
   * @param sourceId {string} - source id
   * @param destinationId {string} - destination id
   * @param namespace {string} - namespace
   * @param encoding {string} - encoding
   * @returns {Channel} - channel
   */
  createChannel(
    sourceId: string,
    destinationId: string,
    namespace: string,
    encoding?: string,
  ) {
    return new Channel(this, sourceId, destinationId, namespace, encoding);
  }
}
