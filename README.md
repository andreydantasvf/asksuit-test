
# Asksuite Reservation Search API

Hotel availability lookup API built with Node.js and Express. It crawls the Fasthotel reservation engine to return structured accommodation data and exposes documentation, validation, and automated tests to ensure reliability.

## ✨ Highlights

- `/search` POST endpoint retrieves availability from Fasthotel using Puppeteer.
- Reservation API responses are monitored to capture warnings before HTML parsing.
- Zod validation and centralized error handling guarantee consistent error payloads.
- Swagger/OpenAPI documentation served at `/docs` with curated examples.
- Jest unit tests cover parsing utilities and the main search flow using a mocked BrowserService.
- Configurable CORS via environment variables for safe cross-origin access.

## 🧱 Architecture Overview

| Layer | Responsibility |
| --- | --- |
| `routes/router.js` | HTTP routing, payload validation, delegation to services |
| `services/SearchService.js` | Orchestrates BrowserService, monitors reservation API, parses HTML |
| `services/BrowserService.js` | Thin wrapper around Puppeteer browser/page utilities |
| `validators/searchValidator.js` | Zod schemas for date validation and business rules |
| `middlewares/errorHandler.js` | Normalizes validation, client, and server errors |
| `docs/swagger.js` | Swagger specification and reusable schema components |

Static assets (HTML samples) live under `services/` for development support.

## ⚙️ Configuration & Enhancements

- **Environment variables** (`.env`):
  - `PORT` (default `8080`)
  - `ALLOWED_ORIGIN` single-origin fallback
- **CORS**: Express `cors` middleware configured dynamically from env values.
- **Validation**: Zod schema checks format, past dates, and chronological order before invoking the scraper.
- **Error handling**: Custom `AppError` with metadata plus global middleware that understands Zod and application errors.
- **Swagger**: `swagger-jsdoc` + `swagger-ui-express`; docs available at `/docs`.
- **Testing**: Jest suite with BrowserService mocked via dependency injection to make search flow deterministic.

## 🚀 How to Run Locally

### Prerequisites

- Node.js 18+ (tested) and npm
- Chromium dependencies (for Puppeteer) installed on the host OS

### Install & Configure

```bash
npm install
cp .env.example .env
# update .env as needed
```

### Development Server

```bash
npm run dev
```

API will listen on `http://localhost:8080` (unless `PORT` overrides).

### Production Mode

```bash
npm start
```

### Run Tests

```bash
npm test
```

Jest executes the unit suite located under `tests/`.

## 📡 API Reference

### POST `/search`

| Body | Type | Description |
| --- | --- | --- |
| `checkin` | string (YYYY-MM-DD) | Arrival date (UTC) |
| `checkout` | string (YYYY-MM-DD) | Departure date (must be after `checkin`) |

Success response: array of accommodations with `name`, `description`, `price`, `image`.

Error scenarios include:

- Validation errors (`400`, `VALIDATION_ERROR`)
- Reservation API warnings (`400`, `RESERVATION_API_ERROR`)
- Navigation timeouts (`504`, `NAVIGATION_TIMEOUT`)
- Unexpected failures (`500`, `INTERNAL_SERVER_ERROR`)

The full contract, schemas, and examples are available in the Swagger UI.

## 📖 Documentation Links

- **Production API**: [https://asksuit-test.onrender.com/](https://asksuit-test.onrender.com/)
- **Production Docs**: [https://asksuit-test.onrender.com/docs](https://asksuit-test.onrender.com/docs)
- **Chat Bot Example**: [https://asksuit-chat-bot.netlify.app](https://asksuit-chat-bot.netlify.app)

## 🧪 Testing Strategy

- Unit tests cover:
  - Price extraction logic and HTML parsing utilities.
  - `SearchService.search` happy path and reservation error handling using a mocked BrowserService.
- Jest runner configured through `jest.config.js` with Node environment.
- Mocks emulate Puppeteer responses (waiters, listeners, payloads) without opening a real browser.

## 🔐 Validation & Error Handling

- Zod validates payload structure, date format, future dates, and chronological order.
- Errors are converted into readable JSON envelopes with HTTP status codes.
- Reservation API warnings are converted into `AppError` instances before HTML parsing occurs.
- Global handler logs unexpected exceptions but hides internal details from the client.
