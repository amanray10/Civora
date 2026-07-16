# REST API Reference

Base URL: `http://localhost:5000/api` · Auth: `Authorization: Bearer <jwt>`

## Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | /auth/google | `{ credential }` | Google ID token → JWT + user |
| POST | /auth/register | `{ name, email, password }` | bcrypt-hashed fallback signup |
| POST | /auth/login | `{ email, password }` | |
| POST | /auth/department-login | `{ email, password, departmentId }` | department/admin accounts only; selected department must match the account's department |
| GET | /auth/me | — | current user |

## Complaints
| Method | Endpoint | Body / Query | Access |
|---|---|---|---|
| POST | /complaints | multipart: `title, description, location, files[]` (≤4 × 5 MB) | any signed-in user; AI pipeline runs async |
| GET | /complaints | `?status=&search=` | citizen → own; department/admin → own department; superadmin → all |
| GET | /complaints/:id | — | owner, its department (department/admin), or superadmin |
| PUT | /complaints/:id/status | `{ status, note? }` — Accepted / In Progress / Resolved / Rejected / Closed | department or admin (own department), or superadmin |
| PUT | /complaints/:id/assign | `{ departmentId }` | superadmin re-route only |

## Chatbot
| POST | /chat | `{ question }` — Ollama answer, saved to history |
| GET | /chat/history | last 100 messages |

## Departments & Admin (superadmin only)
| GET | /departments | public list |
| GET | /admin/analytics | totals, status/priority/category/department breakdowns, 14-day trend |
| GET | /admin/users | all users (incl. `isActive`) |
| PUT | /admin/users/:id/role | `{ role, departmentId? }` — `departmentId` required for `department`/`admin` roles |
| PUT | /admin/users/:id/deactivate | soft-deletes a user (sets `isActive: false`) |
| PUT | /admin/users/:id/reactivate | restores a deactivated user |

## Dept Admin (department-scoped `admin` role)
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| GET | /dept-admin/users | — | citizens with a request in this department + this department's officers |
| POST | /dept-admin/officers | `{ email }` | promotes a citizen (by email) to `department` officer of this department |
| PUT | /dept-admin/officers/:id/demote | — | demotes one of this department's officers back to `citizen` |
| PUT | /dept-admin/users/:id/deactivate | — | deactivates a citizen/officer scoped to this department |
| PUT | /dept-admin/users/:id/reactivate | — | reactivates a citizen/officer scoped to this department |

## Socket.io events (client listens)
- `complaint:update` `{ id, status, department?, priority? }` — sent to the complaint owner (and duplicate owners)
- `complaint:new` `{ id }` — sent to the assigned department room

Errors are always `{ "error": "message" }` with an appropriate HTTP status.
