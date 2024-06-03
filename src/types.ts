import type { Message } from "protobufjs";
import type { Buffer } from "node:buffer";

export type CastMessage =
  | "CastMessage"
  | "AuthChallenge"
  | "AuthResponse"
  | "AuthError"
  | "DeviceAuthMessage";

export type MessageMethods = {
  serialize: (data: Message) => Uint8Array;
  parse: (data: Uint8Array) => Message;
};

export type MessageExport = Record<CastMessage, MessageMethods>;

export interface SendMessage {
  protocolVersion: number;
  sourceId: string;
  destinationId: string;
  namespace: string;
  payloadType: number;
  payloadBinary?: Buffer;
  payloadUtf8?: string;
}

export type PacketStreamWrapperEvents = {
  packet: [Uint8Array];
};

export type ChannelEvents = {
  message: [unknown, boolean];
  close: [];
};

export type ClientEventTypes = {
  connect: [];
  close: [];
  error: [Error];
  message: [string, string, string, Buffer | string];
};

export interface ClientConnectOptions {
  host: string;
  port?: number;
  rejectUnauthorized?: boolean;
}
