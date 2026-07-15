# REST API Reference

Base URL: `http://localhost:5000/api` · Auth: `Authorization: Bearer <jwt>`

## Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | /auth/google | `{ credential }` | Google ID token → JWT + user |
| POST | /auth/register | `{ name, email, password }` | bcrypt-hashed fallback signup |
| POST | /auth/login | `{ email, password }` | |
| GET | /auth/me | — | current user |

## Complaints
| Method | Endpoint | Body / Query | Access |
|---|---|---|---|
| POST | /complaints | multipart: `title, description, location, files[]` (≤4 × 5 MB) | any signed-in user; AI pipeline runs async |
| GET | /complaints | `?status=&search=` | citizen → own; department → its queue; admin → all |
| GET | /complaints/:id | — | owner, its department, or admin |
| PUT | /complaints/:id/status | `{ status, note? }` — Accepted / In Progress / Resolved / Rejected / Closed | department (own queue) or admin |
| PUT | /complaints/:id/assign | `{ departmentId }` | admin re-route |

## Chatbot
| POST | /chat | `{ question }` — Ollama answer, saved to history |
| GET | /chat/history | last 100 messages |

## Departments & Admin
| GET | /departments | public list |
| GET | /admin/analytics | totals, status/priority/category/department breakdowns, 14-day trend |
| GET | /admin/users | all users |
| PUT | /admin/users/:id/role | `{ role, departmentId? }` |

## Socket.io events (client listens)
- `complaint:update` `{ id, status, department?, priority? }` — sent to the complaint owner (and duplicate owners)
- `complaint:new` `{ id }` — sent to the assigned department room

Errors are always `{ "error": "message" }` with an appropriate HTTP status.
