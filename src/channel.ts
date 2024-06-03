import { EventEmitter } from "@denosaurs/event";
import type { ChannelEvents, ClientEventTypes } from "./types.ts";

export class Channel extends EventEmitter<ChannelEvents> {
  bus: EventEmitter<ClientEventTypes>;
  sourceId: string;
  destinationId: string;
  namespace: string;
  encoding?: string;

  constructor(
    bus: EventEmitter<ClientEventTypes>,
    sourceId: string,
    destinationId: string,
    namespace: string,
    encoding?: string,
  ) {
    super();

    const onMessage = (
      sourceId: string,
      destinationId: string,
      namespace: string,
      data: string,
    ) => {
      if (sourceId !== this.destinationId) return;
      if (destinationId !== this.sourceId && destinationId !== "*") return;
      if (namespace !== this.namespace) return;
      this.emit("message", decode(data, this.encoding), destinationId === "*");
    };

    const onClose = () => {
      this.bus.off("message", onMessage);
    };

    this.bus = bus;
    this.sourceId = sourceId;
    this.destinationId = destinationId;
    this.namespace = namespace;
    this.encoding = encoding;

    this.bus.on("message", onMessage);
    this.once("close", onClose);
  }

  close() {
    this.emit("close");
  }
}

export function encode(data: unknown, encoding?: string) {
  if (!encoding) return data;
  switch (encoding) {
    case "JSON":
      return JSON.stringify(data);
    default:
      throw new Error("Unsupported channel encoding: " + encoding);
  }
}

export function decode(data: string, encoding?: string) {
  if (!encoding) return data;
  switch (encoding) {
    case "JSON":
      return JSON.parse(data);
    default:
      throw new Error("Unsupported channel encoding: " + encoding);
  }
}
