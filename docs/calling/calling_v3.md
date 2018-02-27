## Calling v3

### Call Setup

#### Alice calls Bob

* Caller: Alice
* Callee: Bob

##### Act 1: Alice

1.  Start call from UI
1.  Check for existing call
1.  Create an `ECall` entity with "state" `outgoing`
1.  Get user media stream
1.  Create local peer connection
1.  Create and set local SDP (type: offer)
1.  Initialized WebRTC data channel
1.  Generate ICE candidates (until last candidate or specified timeout)
1.  Create an `ECallMessage` of "type" `SETUP` and "response" set to `false`
1.  Wrap contents of `ECallMessage` in a generic message of type `calling`
1.  Send generic message to Bob via encrypted message channel (Wire backend)

##### Act 2: Bob

1.  Receiving a generic message of type `calling`
1.  Creating an `ECall` entity with "state" `incoming`
1.  Clicking on accept call (in UI)
1.  Check for existing call
1.  Get user media stream
1.  Setting `ECall` "state" to `connecting`
1.  Create local peer connection
1.  Set cached remote SDP (from Alice's generic message)
1.  Initializes WebRTC data channel sent by Alice
1.  Create and set local SDP (type: `answer`)
1.  Generate ICE candidates (until last candidate or specified timeout)
1.  Create an `ECallMessage` of "type" `SETUP` and "response" set to `true`
1.  Wrap contents of `ECallMessage` in a generic message of type `calling`
1.  Send generic message to Bob via encrypted message channel (Wire backend)

##### Act 3: Alice

1.  Receives a generic message of type `calling` (from Bob)
1.  Sets `ECall` "state" to `connecting`
1.  Set remote SDP (from Bob's generic message)

##### The End: Alice & Bob

1.  Waiting for peer connection establishment
1.  Setting `ECall` "state" to `ongoing` (once peer connection is established)

##### Special Case: Bob doesn't answer within timeout frame

1.  Alice sends an `ECallMessage` of "type" `CANCEL` and "response" set to `false`
1.  Bob confirms with `ECallMessage` of "type" `CANCEL` and "response" set to `true`

##### Call hangup

1.  Alice sends `ECallMessage` of "type" `HANGUP` and "response" set to `false` via WebRTC data channel
1.  Bob confirms with `ECallMessage` of "type" `HANGUP` and "response" set to `true`
