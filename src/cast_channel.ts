const PROTO = `
syntax = "proto2";

option optimize_for = LITE_RUNTIME;

package extensions.api.cast_channel;

message CastMessage {
  // Always pass a version of the protocol for future compatibility
  // requirements.
  enum ProtocolVersion {
    CASTV2_1_0 = 0;
  }
  required ProtocolVersion protocol_version = 1;

  // source and destination ids identify the origin and destination of the
  // message.  They are used to route messages between endpoints that share a
  // device-to-device channel.
  //
  // For messages between applications:
  //   - The sender application id is a unique identifier generated on behalf of
  //     the sender application.
  //   - The receiver id is always the the session id for the application.
  //
  // For messages to or from the sender or receiver platform, the special ids
  // 'sender-0' and 'receiver-0' can be used.
  //
  // For messages intended for all endpoints using a given channel, the
  // wildcard destination_id '*' can be used.
  required string source_id = 2;
  required string destination_id = 3;

  // This is the core multiplexing key.  All messages are sent on a namespace
  // and endpoints sharing a channel listen on one or more namespaces.  The
  // namespace defines the protocol and semantics of the message.
  required string namespace = 4;

  // Encoding and payload info follows.

  // What type of data do we have in this message.
  enum PayloadType {
    STRING = 0;
    BINARY = 1;
  }
  required PayloadType payload_type = 5;

  // Depending on payload_type, exactly one of the following optional fields
  // will always be set.
  optional string payload_utf8 = 6;
  optional bytes payload_binary = 7;
}

// Messages for authentication protocol between a sender and a receiver.
message AuthChallenge {
}

message AuthResponse {
  required bytes signature = 1;
  required bytes client_auth_certificate = 2;
  repeated bytes client_ca = 3;
}

message AuthError {
  enum ErrorType {
    INTERNAL_ERROR = 0;
    NO_TLS = 1;  // The underlying connection is not TLS
  }
  required ErrorType error_type = 1;
}

message DeviceAuthMessage {
  // Request fields
  optional AuthChallenge challenge = 1;
  // Response fields
  optional AuthResponse response = 2;
  optional AuthError error = 3;
}
`;

export default PROTO;
