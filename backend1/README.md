# QueueLess Campus - Backend

A digital token/queue system for a single college counter (canteen / library /
admin desk). Students pull a token, staff call the next one, everyone watches
the live queue over Socket.IO.

## Folder structure

```
QueueLess-Backend/
├── APIs/
│   ├── AuthAPI.js           # register, login, get current user
│   ├── CounterAPI.js        # read the single counter document
│   ├── TokenAPI.js          # queue status, create/call/complete tokens
│   └── NotificationAPI.js   # read own notifications
├── config/
│   └── db.js                # mongoose connection
├── middlewares/
│   ├── authMiddleware.js    # verifies JWT cookie, sets req.user = { id, role }
│   └── roleMiddleware.js    # requireRole(...roles) route guard
├── models/
│   ├── User.js
│   ├── Counter.js
│   ├── Token.js
│   └── Notification.js
├── server.js                 # express + http server + socket.io wiring
├── .env.example
├── package.json
└── README.md
```

## Setup

1. Install dependencies
   ```
   npm install
   ```
2. Copy the env file and fill in your values
   ```
   cp .env.example .env
   ```
3. Start MongoDB locally (or point `MONGODB_URI` at Atlas)
4. Run the server
   ```
   npm start
   ```

The server listens on `PORT` (default `5000`) and exposes both the REST API
and a Socket.IO server on the same HTTP server.

Auth uses a JWT stored in an `httpOnly` cookie (`token`), set on login. The
same JWT is also returned in the login response body in case a client prefers
to store it itself.

## Route summary

| Method | Route                     | Auth              | Description                                             |
|--------|----------------------------|-------------------|-----------------------------------------------------------|
| POST   | /auth/register              | Public            | Create a new user (name, email, phone, password, role)   |
| POST   | /auth/login                 | Public            | Verify credentials, set JWT cookie, return user + token   |
| GET    | /auth/me                    | JWT               | Return the logged-in user (no password)                   |
| GET    | /counter                    | Public            | Return the single Counter doc (auto-created if missing)    |
| GET    | /token/queue                 | Public            | `{ currentTokenNo, waitingCount, avgServiceTimeSec }`       |
| POST   | /token                       | JWT + student      | Create a new token, bump `lastTokenNo`, emit `queue:update` |
| GET    | /token/my                    | JWT + student      | Caller's active token + `position` + `estimatedWaitSec`     |
| PATCH  | /token/call-next             | JWT + staff        | Serve the oldest waiting token, create a Notification       |
| PATCH  | /token/:id/complete          | JWT + staff        | Complete a serving token, update Counter + avg service time  |
| GET    | /notification/my              | JWT               | Caller's notifications, newest first                        |

### Socket.IO events

- `queue:update` — `{ currentTokenNo, waitingCount, avgServiceTimeSec }`,
  broadcast after any token create/call/complete action.
- `token:called` — `{ tokenId, userId, tokenNo }`, broadcast when a token
  moves to `serving`.

## Scope / constraints

- Single hardcoded counter — no multi-counter or department support.
- No no-show/skip handling.
- Notifications are just stored and read back via `GET /notification/my` —
  nothing is actually sent over SMS/push/WhatsApp.
