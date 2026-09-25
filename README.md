# Equipment Reservation Challenge

Shared equipment reservation planner. Equipment belongs to a location, and employees reserve
quantities for a time interval. A reservation is `DRAFT` or `CONFIRMED`, and only confirmed
reservations consume availability.

## Setup

Requires Node.js 22 (see `.nvmrc`) and pnpm 11 (pinned in `package.json`, so `corepack` will fetch
the right version). No environment file, cloud account or external service is needed: the app runs
on a local SQLite database at `dev.db`.

```bash
pnpm install
pnpm db:setup   # prisma generate + migrate deploy + deterministic seed
pnpm dev
```

Open http://localhost:3000. `pnpm db:reset` restores the seeded state at any time.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Strict TypeScript |
| `pnpm db:setup` | Generate Prisma, apply the schema, seed |
| `pnpm db:reset` / `pnpm db:seed` | Restore or reload the seed data |

## What I built

| Work | Focused time |
| --- | --- |
| Ticket 1 — Fix reservation availability | ~25 min |
| Ticket 2 — Create reservation (backend + frontend) | ~3 h 50 min |
| Bonus — Edit reservation | ~30 min |
| Late fix — duplicate-equipment message in the form | ~5 min |
| **Total** | **~4 h 50 min** |

### Ticket 1 — Fix Reservation Availability

The availability code was a little hidden because no page or endpoint used it yet. Once I found it,
I ran the same query directly against the database and reproduced the problem described in the
ticket: a reservation ending at 12:00 was blocking its equipment for a new reservation starting at
12:00.

The code is trying to answer *"how many units of this equipment are already reserved in the
requested period?"*, but its date filters treated the interval as closed at both ends:

```ts
// before
startAt: { lte: input.endAt },
endAt: { gte: input.startAt },

// after
startAt: { lt: input.endAt },
endAt: { gt: input.startAt },
```

Intervals are `[start, end)`, so an existing reservation overlaps only when it **starts before the
requested end** and **ends after the requested start**. Both comparisons become strict. I verified
the fix against the cases I had in mind: adjacent before, adjacent after, contained, containing and
partial overlap on either side.

The other rules in the ticket hold on the server: only `CONFIRMED` reservations are counted,
quantity must be a positive integer, the end must be after the start, and availability is re-checked
on every create and edit.

### Ticket 2 — Create Reservation

**Availability for many equipment at once.** A reservation can contain several equipment types, but
`getAvailableQuantity` checked one at a time, with two queries per call (one to confirm the
equipment exists at the location, one to sum what is already reserved). A reservation with 10 items
would have needed 20 queries. I changed it to accept a list of equipment: one query loads them all
scoped to the location, and one `groupBy` sums reserved quantities per equipment. **Any reservation
now costs two queries, from 20 to 2 in that example.** The per-equipment result is also what lets the
API tell the user *which* item is short.

**Backend — `POST /api/reservations`.**

1. The payload is validated with a Zod schema. On failure it returns `400 VALIDATION_ERROR` with
   every issue and its field path.
2. `checkAvailability` confirms each equipment exists at the selected location (`404
   EQUIPMENT_NOT_FOUND` otherwise) and has enough availability.
3. If any item is short it returns `400 NO_AVAILABILITY` with the available quantity of each item
   that is short, so the frontend can show a specific message.
4. Otherwise the `Reservation` and its `ReservationItem` rows are written in a single transaction
   and returned with `201`.

Invalid JSON returns `400 INVALID_JSON`; anything unexpected is logged and returns a generic `500`.

**Frontend — `/reservations/new`.** The page is a server component: it calls
`getLocationsAndEquipments` and passes the data to the form (a client component), so the client
already has it and does not need to fetch it. That function returns a map of equipment by location
id and a map of location name by location id. I chose maps over an array because the equipment has
to be filtered by location every time a location is selected, and a map makes that a direct lookup.

- **Location** is an autocomplete, so the user can type to find it.
- **Date range** uses `@mui/x-date-pickers` (the free extension of Material UI). Clicking a field
  opens the day picker, starting at the current month, then the time. Past dates are disabled and
  times are in UTC.
- **Equipment rows** list only the equipment of the selected location, each with a quantity.
- **Status** is Draft or Confirmed.

The submit is sent only when the form is valid: location selected, start before end, and at least
one equipment with a quantity greater than zero, with no equipment repeated. When the server
answers `NO_AVAILABILITY`, the form shows under each affected row how many are available, e.g.
*"Only 2 Generators are available for the selected period."*, and the message clears when the user
types an acceptable quantity. The form also has loading (while submitting), error (for any
server error other than availability) and success states, and it is responsive on desktop and
mobile.

### Bonus — Edit Reservation

I made the create form reusable: it takes an optional `reservation` prop that prefills it and
switches the submit to `PUT /api/reservations/[id]`. Every row of the reservation list (table on
desktop, card on mobile) links to `/reservations/[id]/edit`.

The reservation being edited must not conflict with itself, so `getAvailableQuantity` takes an
optional `excludeReservationId` that leaves it out of the overlap query. The update and the
replacement of its items happen in one transaction.

## Assumptions

- **Drafts are validated against availability, but never consume it.** "Requested quantity cannot
  exceed availability" is stated without a status qualifier, so I enforce it on every request,
  including drafts. A draft never blocks anyone else, and confirming it later is re-checked on the
  server.
- **Equipment appears at most once per reservation.** The schema enforces this with
  `@@unique([reservationId, equipmentId])`; a request that repeats an equipment is rejected rather
  than merged.
- **A reservation cannot start in the past.** The picker disables past dates and the API rejects
  them.
- **All date-times are UTC.** The picker is pinned to UTC and the UI says so, which keeps the
  boundary rules unambiguous.
- **Editing replaces the item set.** Submitting an edit states what the reservation should now
  contain; it is not a patch.
- **No authentication**, per the non-goals, so any caller may create or edit any reservation.

## Technical decisions

- **Availability lives in one server module** (`src/server/reservations/availability.ts`). Both
  routes call it and the UI never computes availability itself.
- **One grouped aggregate instead of a query per item**, as described in Ticket 2.
- **Zod schemas shared between client and server.** Both extend one base schema. The form schema
  takes what the inputs produce (quantity as a string, dates as `Date`); the API schema takes what
  JSON carries (ISO strings, numbers). React Hook Form uses the form schema through `zodResolver`,
  so the rules are defined once instead of on every `Controller`.
- **The form is typed on the schema's input and the submit handler on its output**
  (`useForm<z.input, unknown, z.output>`), so types stay strict end to end.
- **`FormProvider` with independent field components** (location, date range, equipment rows,
  status), each reading from `useFormContext`. This is what made the form easy to reuse for editing.
- **TanStack Query for the request.** `useMutation` handles loading, success and error states
  without writing that boilerplate by hand, which is how I would do it in production.
- **Errors are a contract, not strings.** `DomainError` carries an HTTP status and a stable code,
  and the frontend branches on the code.
- **Explicit `ReservationItem` relation and transactional writes**, as the brief requires.

## Trade-offs, incomplete work and improvements

- **Loading the whole catalogue on the server.** Passing all locations and equipment to the form is
  fast and simple for a small catalogue, but with many locations and equipment it would slow the
  page. Options, from least to most change:
  - cache `getLocationsAndEquipments` and invalidate it when locations or equipment are added or
    updated;
  - wrap the form in `<Suspense>` so the page shows a loading state instead of waiting for the data;
  - fetch it from the client with its own loading and error states;
  - **best option at scale:** server-side search in the autocompletes with debounce, first locations
    by name, then equipment by name within the selected location. Each input then needs its own
    loading and error state.
- **Error handling for the catalogue.** I only covered the happy path here: if
  `getLocationsAndEquipments` fails, the page falls through to the generic app error boundary. In
  production I would catch it and show a dedicated message with a retry (a page reload is enough
  while this is the only data on the page).
- **`/reservations/new` is statically prerendered** in a production build, so its catalogue is
  captured at build time. It should use `force-dynamic` or a tagged cache once the catalogue can
  change.
- **Large `IN` lists.** Availability passes all requested equipment ids in one `IN` filter. With
  thousands of ids this can get slow; I would use batching (e.g. 10 requests of 100 instead of 1 of
  1,000, with the batch size measured) or streaming if the database supports it. With the handful
  of items a reservation has, one query is the right choice.
- **Old drafts are never cleaned up.** In production I would run an asynchronous job to remove
  stale drafts.
- **Edits replace items rather than diffing them**, which is simpler but changes the
  `ReservationItem` ids.
- **Availability conflicts return `400`.** `409 Conflict` would describe them better.
- **Pluralization is naive** (a trailing "s"), which is correct for every name in the seed data.
- **`notFound()` on the edit page renders the right page but responds with HTTP 200**, because the
  response has already started streaming.
- **No automated tests** (not required). With more time I would add unit tests for the interval
  edge cases and an integration test for the endpoint.

## Production considerations

### Concurrent confirmations

The server re-checks availability before writing, but the check and the insert are separate
steps, so two requests could both see the same free capacity and both commit. I could not
reproduce an overbooking here (SQLite allows a single writer at a time), but that is a property of
this runtime, not of the design.

On Postgres I would run the check inside the same transaction as the insert and lock the equipment
rows being reserved with `SELECT ... FOR UPDATE`, releasing them only when the transaction that
saves the reservation finishes. Another approach is a queue that processes reservation requests
one at a time (e.g. per location); both can be combined. A database constraint cannot enforce this
because the rule is a sum across rows.

### Higher traffic

- **Indexes / query strategy.** The overlap query is supported by
  `@@index([locationId, status, startAt, endAt])` on `Reservation` and `@@index([equipmentId])` on
  `ReservationItem`. The equipment lookup filters by `id` and `locationId`; a composite index on
  `Equipment(locationId, id)` would serve it fully. I would confirm with `EXPLAIN` on real data
  before adding it.
- **Caching** the location/equipment catalogue, which changes rarely and is read on every form
  render, with invalidation after catalogue mutations.
- **Pagination** and a narrower select for the reservation list.
- **Read replicas** for reads, keeping confirmations on the primary.
- **Async work** (notifications, downstream sync) behind a queue instead of inline in the request.

## Manual verification

With the seeded data (`pnpm db:reset`), Austin Warehouse has 4 Generators. On 2027-09-20 there is a
confirmed reservation 09:00–12:00 with 2 Generators, another confirmed 12:00–15:00 with 2
Generators, and a draft 10:00–11:00 holding all 4.

1. **Adjacency + conflict** — Austin, 2027-09-20 12:00–15:00, 3 Generators, Confirmed. It is
   rejected with *"Only 2 Generators are available for the selected period."*: the 09:00–12:00
   reservation does not count, only the afternoon one does.
2. **Happy path** — change the quantity to 2 and submit. It saves and appears in the list.
3. **Drafts do not consume** — Austin, 2027-09-20 10:00–11:00, 2 Generators, Confirmed. It saves
   even though the draft holds all 4.
4. **Validation** — submit an empty form, an end before the start, and the same equipment twice.
   Each shows a field error.
5. **Edit does not conflict with itself** — open any confirmed reservation, change nothing, and
   save. It succeeds.
6. **Mobile** — at a narrow viewport the list becomes cards and the form stacks.

## Use of AI

I used Claude Code as another pair of eyes. When I felt a ticket was complete, I asked it to verify
my work but, if something was wrong, **not to tell me how to fix it**, so the fixes are my own.

I tested every flow by hand first (the cases in *Manual verification* above), and then asked the
agent to test them again, calling the API directly and driving the UI, just to be sure.

After finishing the project I also used it for things I would normally put in a `CLAUDE.md` /
`AGENTS.md` or search on Google: checking typos, improving user-facing messages, formatting the code
and sorting imports, improving this README, and questions such as why a Zod `.refine()` was not
running under React Hook Form (a field-level error aborts object-level refinements).
