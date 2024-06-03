import { Buffer } from "node:buffer";
import tls from "node:tls";

import { EventEmitter } from "@denosaurs/event";

import { PacketStreamWrapper } from "./packet-stream-wrapper.ts";
import getMessages from "./proto.ts";
import type { Message } from "protobufjs";
import type { SendMessage } from "./types.ts";

const CastMessage = getMessages().CastMessage;

export type ServerEvents = {
  message: [string, string, string, string, Buffer | string];
  close: [];
  error: [Error];
};
export interface ServerOptions {
  [key: string]: unknown;
}

/**
 * CastV2 server
 */
export class Server extends EventEmitter<ServerEvents> {
  server: tls.Server;
  clients: Record<string, { socket: tls.TLSSocket; ps: PacketStreamWrapper }>;

  /**
   * Create a new CastV2 server
   *
   * @param options {ServerOptions} - server options (tls.ServerOptions)
   */
  constructor(options: ServerOptions) {
    super();

    this.server = new tls.Server(options);
    this.clients = {};
  }

  /**
   * Start the server
   *
   * @param port {number} - port to listen on
   * @param host {string} - host to listen on
   * @param callback {() => void} - callback when server is listening
   */
  listen(port: number, host: string, callback: () => void): void {
    // deno-lint-ignore no-this-alias
    const self = this;

    function onlisten() {
      const addr = self.server.address();
      console.log(`server listening on ${addr.address}:${addr.port}`);
      if (callback) callback();
    }

    function onconnect(socket: tls.TLSSocket) {
      const ps = new PacketStreamWrapper(socket);
      const clientId = genClientId(socket);

      ps.on("packet", onpacket);
      socket.once("close", ondisconnect);

      function onpacket(buf: Buffer) {
        const message = CastMessage.parse(buf) as SendMessage & Message;

        if (message.protocolVersion !== 0) {
          console.log(
            `client error: ${clientId} unsupported protocol version (${message.protocolVersion})`,
          );
          const socket = self.clients[clientId].socket;
          socket.end();
          return;
        }

        self.emit(
          "message",
          clientId,
          message.sourceId,
          message.destinationId,
          message.namespace,
          message.payloadType === 1
            ? message.payloadBinary
            : message.payloadUtf8,
        );
      }

      function ondisconnect() {
        console.log(`client ${clientId} disconnected`);
        ps.off("packet", onpacket);
        delete self.clients[clientId];
      }

      self.clients[clientId] = {
        socket: socket,
        ps: ps,
      };
    }

    function onshutdown() {
      console.log("server shutting down");
      self.server.removeListener("secureConnection", onconnect);
      self.emit("close");
    }

    function onerror(err: Error) {
      console.log(`error: ${err.message} ${err}`);
      self.emit("error", err);
    }

    this.server.listen.apply(this.server, [port, host, onlisten]);
    this.server.on("secureConnection", onconnect);
    this.server.on("error", onerror);
    this.server.once("close", onshutdown);
  }

  /**
   * Close the server
   */
  close(): void {
    this.server.close();
    for (const clientId in this.clients) {
      const socket = this.clients[clientId].socket;
      socket.end();
    }
  }

  /**
   * Send a message to a client
   *
   * @param clientId {string} - client id
   * @param sourceId {string} - source id
   * @param destinationId {string} - destination id
   * @param namespace {string} - namespace
   * @param data {Buffer | string} - data to send
   */
  send(
    clientId: string,
    sourceId: string,
    destinationId: string,
    namespace: string,
    data: Buffer | string,
  ): void {
    const message: SendMessage = {
      protocolVersion: 0,
      sourceId: sourceId,
      destinationId: destinationId,
      namespace: namespace,
      payloadType: 0,
    };

    if (Buffer.isBuffer(data)) {
      message.payloadType = 1;
      message.payloadBinary = data;
    } else {
      message.payloadUtf8 = data;
    }

    const buf = CastMessage.serialize(message as unknown as Message);
    const ps = this.clients[clientId].ps;
    ps.send(buf);
  }
}

function genClientId(socket: tls.TLSSocket) {
  return [socket.remoteAddress, socket.remotePort].join(":");
}
