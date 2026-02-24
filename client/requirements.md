## Packages
date-fns | Formatting message timestamps
lucide-react | Icons for the chat interface (upload, send)

## Notes
The app uses a 90s retro aesthetic.
Polling is configured on the `/api/messages` endpoint every 1000ms.
File uploads expect `POST /api/upload` accepting `multipart/form-data` with a `file` field.
The backend must return `{ filename: string }` from the upload endpoint.
