import { type Message, parse, type Type } from "protobufjs";

import PROTO from "./cast_channel.ts";
import type { CastMessage, MessageExport } from "./types.ts";

const messages: CastMessage[] = [
  "CastMessage",
  "AuthChallenge",
  "AuthResponse",
  "AuthError",
  "DeviceAuthMessage",
];

const getMessages = (): MessageExport => {
  const extensions = {} as Record<CastMessage, Type>;
  const { root } = parse(PROTO);

  messages.forEach(function (message) {
    extensions[message] = root.lookupType(
      `extensions.api.cast_channel.${message}`,
    );
  });

  const messageExport = {} as MessageExport;

  messages.forEach(function (message) {
    messageExport[message] = {
      serialize: function (data: Message) {
        if (!extensions[message]) {
          throw new Error("extension not loaded yet");
        }
        const Message = extensions[message];
        return Message.encode(data).finish();
      },
      parse: function (data: Uint8Array) {
        if (!extensions[message]) {
          throw new Error("extension not loaded yet");
        }
        const Message = extensions[message];
        return Message.decode(data);
      },
    };
  });

  return messageExport;
};

export default getMessages;
