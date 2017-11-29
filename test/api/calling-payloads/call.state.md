## call.state

```js
{
    "conversation": "10f2f200-9452-4738-abb6-5a27ea559a9f",
    "cause": "requested",
    "participants": {
        "a4c26f69-1b73-4ba6-a99e-88183f83d8cc": {
            "state": "idle",
            "quality": null
        },
        "7442a7df-8cd8-493f-aa7c-4939a2683d02": {
            "state": "idle",
            "quality": null
        },
        "cf3dbb70-7f2e-4136-a2f2-841e635661da": {
            "state": "idle",
            "quality": null
        },
        "f800ce0b-207d-4451-bc73-01ea9686d1ef": {
            "state": "idle",
            "quality": null
        },
        "3bf04cee-b207-498e-80f1-f3184fb13757": {
            "state": "idle",
            "quality": null
        },
        "b7cc6726-deda-4bd1-a10d-a0c6a0baf878": {
            "state": "idle",
            "quality": null
        },
        "36876ec6-9481-41db-a6a8-94f92953c538": {
            "state": "joined",
            "quality": null
        },
        "6c3d1b7c-8985-418b-9897-739c84c9e2c5": {
            "state": "idle",
            "quality": null
        },
        "532af01e-1e24-4366-aacf-33b67d4ee376": {
            "state": "idle",
            "quality": null
        },
        "2bde49aa-bdb5-458f-98cf-7d3552b10916": {
            "state": "idle",
            "quality": null
        }
    },
    "self": null,
    "sequence": 1045,
    "type": "call.state",
    "session": "9db1de9e-2d39-4156-bec1-bfc15b84963b"
}
```

## Response when setting the self state (as the caller)

```js
{
    "participants": {
        "36876ec6-9481-41db-a6a8-94f92953c538": {
            "state": "idle",
            "quality": null
        },
        "532af01e-1e24-4366-aacf-33b67d4ee376": {
            "state": "joined",
            "quality": null
        }
    },
    "self": {
        "state": "joined",
        "quality": null
    },
    "sequence": 280,
    "session": "aa33f562-e44e-4ec7-8a46-aaa9ba9ee73e"
}
```
