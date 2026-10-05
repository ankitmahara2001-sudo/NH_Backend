# API reference

Base URL (local): `http://localhost:5000/api`. All bodies are JSON. Money is in integer **paise**.

- Success: `{ "data": ..., "meta"?: { "page", "pageSize", "total" } }`
- Error: `{ "error": { "code", "message", "fields"? } }` — `fields` maps an input name to its message.
- Sessions are httpOnly cookies: `nh_customer` (30 days) and `nh_admin` (12 hours). With curl, use
  `-c cookies.txt` to save and `-b cookies.txt` to send them.

## Public

| Method | Path                                         | Notes                                                                                                                                                                                                                              |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                                    | `{ status, db }` — 503 when the database is down                                                                                                                                                                                   |
| GET    | `/home`                                      | slides, destinations, popular packages, offers, gallery, reviews, posts                                                                                                                                                            |
| GET    | `/packages`                                  | `destination` (slug), `tripType`, `duration` (`short`/`medium`/`long`, repeatable), `minPrice`, `maxPrice` (paise), `priceType`, `month` (YYYY-MM), `sort` (`recommended`/`price_asc`/`price_desc`/`duration`), `page`, `pageSize` |
| GET    | `/packages/:slug`                            | full detail incl. prices, itinerary, departures or blocked dates, reviews, `pricing`                                                                                                                                               |
| GET    | `/packages/:slug/availability?month=YYYY-MM` | departures (fixed-date) or blocked dates + earliest date (all-season)                                                                                                                                                              |
| GET    | `/destinations`                              | with `packageCount`                                                                                                                                                                                                                |
| GET    | `/offers`                                    | coupons shown on the site that are active and in date                                                                                                                                                                              |
| GET    | `/gallery?category=`                         | `temples`, `treks`, `snow`, `lakes_rivers`, `travellers`                                                                                                                                                                           |
| GET    | `/blog?category=&page=&pageSize=`            | `{ featured, posts }` + meta                                                                                                                                                                                                       |
| GET    | `/blog/:slug`                                | content, `relatedPosts`, `relatedPackage`                                                                                                                                                                                          |
| GET    | `/settings/public`                           | every site setting the website uses                                                                                                                                                                                                |
| POST   | `/enquiries`                                 | contact form; emails the admin                                                                                                                                                                                                     |
| POST   | `/pricing/quote`                             | `{ packageId, priceId, counts: { adults, children, infants, units }, travelDate or departureId, couponCode? }` → full price breakdown (same calculation as booking)                                                                |

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/home
curl "http://localhost:5000/api/packages?tripType=trekking&sort=price_asc&page=1"
curl "http://localhost:5000/api/packages?duration=short&duration=long&maxPrice=2000000"
curl http://localhost:5000/api/packages/kedarnath-yatra-package
curl "http://localhost:5000/api/packages/valley-of-flowers-trek/availability?month=2027-07"
curl http://localhost:5000/api/destinations
curl http://localhost:5000/api/offers
curl "http://localhost:5000/api/gallery?category=snow"
curl "http://localhost:5000/api/blog?category=guides"
curl http://localhost:5000/api/blog/complete-kedarnath-yatra-guide-2026
curl http://localhost:5000/api/settings/public
curl -X POST http://localhost:5000/api/pricing/quote -H "Content-Type: application/json" \
  -d '{"packageId":1,"priceId":1,"counts":{"adults":2},"travelDate":"2026-10-20","couponCode":"NORTH10"}'
curl -X POST http://localhost:5000/api/enquiries -H "Content-Type: application/json" \
  -d '{"name":"Rohan Das","email":"rohan@example.com","phone":"98765 43210","message":"Kedarnath in May?"}'
```

## Customer login (email + OTP)

| Method | Path                          | Notes                                                                       |
| ------ | ----------------------------- | --------------------------------------------------------------------------- |
| POST   | `/auth/otp/request`           | `{ email }` — 60 s resend cooldown, 5 codes/hour/email                      |
| POST   | `/auth/otp/verify`            | `{ email, code }` — sets `nh_customer`; creates the account on first login  |
| POST   | `/auth/logout`                | clears the cookie                                                           |
| GET    | `/auth/session`               | the logged-in customer, or `null` (never 401; used by the website header)   |
| GET    | `/me`                         | the logged-in customer (`profileComplete` false until name + phone are set) |
| PATCH  | `/me`                         | `{ name, phone }`                                                           |
| GET    | `/me/bookings`                | the customer's bookings, newest first                                       |
| GET    | `/me/bookings/:bookingNumber` | price snapshot, travellers, payments; 404 if not the customer's             |

```bash
curl -X POST http://localhost:5000/api/auth/otp/request -H "Content-Type: application/json" -d '{"email":"priya@example.com"}'
# With MAIL_DEV_LOG=true the code is printed in the API console.
curl -c cookies.txt -X POST http://localhost:5000/api/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"email":"priya@example.com","code":"123456"}'
curl -b cookies.txt http://localhost:5000/api/me
curl -b cookies.txt -X PATCH http://localhost:5000/api/me -H "Content-Type: application/json" \
  -d '{"name":"Priya Sharma","phone":"98765 43210"}'
curl -b cookies.txt http://localhost:5000/api/me/bookings
curl -b cookies.txt -X POST http://localhost:5000/api/auth/logout
```

## Admin auth

| Method | Path                   | Notes                                                         |
| ------ | ---------------------- | ------------------------------------------------------------- |
| POST   | `/admin/auth/login`    | `{ email, password }` — 5 attempts/minute/IP; sets `nh_admin` |
| POST   | `/admin/auth/logout`   |                                                               |
| GET    | `/admin/auth/me`       |                                                               |
| PATCH  | `/admin/auth/password` | `{ currentPassword, newPassword }` (10+ characters)           |

```bash
curl -c admin.txt -X POST http://localhost:5000/api/admin/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@northerharier.com","password":"<ADMIN_PASSWORD from api/.env>"}'
curl -b admin.txt http://localhost:5000/api/admin/auth/me
curl -b admin.txt -X PATCH http://localhost:5000/api/admin/auth/password -H "Content-Type: application/json" \
  -d '{"currentPassword":"<old>","newPassword":"<new, 10+ characters>"}'
curl -b admin.txt -X POST http://localhost:5000/api/admin/auth/logout
```
