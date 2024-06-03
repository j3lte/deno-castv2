import type { Message } from "protobufjs";
import type { Buffer } from "node:buffer";

/**
 * CastV2 message types
 */
export type CastMessage =
  | "CastMessage"
  | "AuthChallenge"
  | "AuthResponse"
  | "AuthError"
  | "DeviceAuthMessage";

/**
 * CastV2 message methods
 */
export type MessageMethods = {
  /**
   * Serialize a message
   * @param data - message data
   * @returns serialized message
   */
  serialize: (data: Message) => Uint8Array;
  /**
   * Parse a message
   * @param data - serialized message
   * @returns parsed message
   */
  parse: (data: Uint8Array) => Message;
};

/**
 * CastV2 message exports
 */
export type MessageExport = Record<CastMessage, MessageMethods>;

/**
 * CastV2 message
 */
export interface SendMessage {
  /**
   * Protocol version
   */
  protocolVersion: number;
  /**
   * Source ID
   */
  sourceId: string;
  /**
   * Destination ID
   */
  destinationId: string;
  /**
   * Namespace
   */
  namespace: string;
  /**
   * Payload type
   *
   * 0: string
   * 1: binary
   */
  payloadType: number;
  /**
   * Binary payload
   */
  payloadBinary?: Buffer;
  /**
   * UTF-8 payload
   */
  payloadUtf8?: string;
}

/**
 * Packet stream wrapper events
 */
export type PacketStreamWrapperEvents = {
  packet: [Uint8Array];
};

/**
 * Channel events
 */
export type ChannelEvents = {
  message: [unknown, boolean];
  close: [];
};

/**
 * Client event types
 */
export type ClientEventTypes = {
  connect: [];
  close: [];
  error: [Error];
  message: [string, string, string, string | Buffer];
};

/**
 * Client connect options
 */
export interface ClientConnectOptions {
  host: string;
  port?: number;
  rejectUnauthorized?: boolean;
}
