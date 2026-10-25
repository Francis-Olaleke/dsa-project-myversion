import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  unpublishEvent,
  listEventSummaries,
  bookTickets,
  cancelBooking,
  joinWaitlist,
  offerNextOnWaitlist,
  findBookingByReference,
  seatsLeft,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

const throwsCode = (fn, code) =>
  assert.throws(fn, (error) => error instanceof DomainError && error.code === code);

describe('inventory', () => {
  let store;
  let event;
  let tier;

  beforeEach(() => {
    store = createStore();
    event = createEvent(store, {
      title: 'Test Event',
      city: 'Lagos',
      startsAt: '2026-12-05T17:00:00Z',
      organizerId: 'org-1',
    });
    tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 3 });
  });

  describe('creating events and tiers', () => {
    it('starts events as drafts', () => {
      assert.equal(event.status, 'draft');
    });

    it('rejects a missing title, a bad date and bad numbers', () => {
      throwsCode(() => createEvent(store, { title: ' ', city: 'x', startsAt: '2026-12-05' }), 'VALIDATION');
      throwsCode(() => createEvent(store, { title: 'x', city: 'x', startsAt: 'nope' }), 'VALIDATION');
      throwsCode(() => createEvent(store, { title: 'x', city: 'x', startsAt: '2026-02-30' }), 'VALIDATION');
      throwsCode(() => createEvent(store, { title: 'x', city: ' ', startsAt: '2026-12-05' }), 'VALIDATION');
      throwsCode(() => addTier(store, event.id, { name: 'x', priceCents: 19.99, capacity: 5 }), 'VALIDATION');
      throwsCode(() => addTier(store, event.id, { name: 'x', priceCents: 100, capacity: 0 }), 'VALIDATION');
      assert.equal(store.events.size, 1);
    });

    it('creates identified drafts that are absent from the public summaries', () => {
      const second = createEvent(store, {
        title: 'Second Event',
        city: 'Abuja',
        venue: 'Abuja Hall',
        startsAt: '2026-12-06T18:30:00Z',
      });
      assert.ok(event.id);
      assert.notEqual(event.id, second.id);
      assert.equal(event.status, 'draft');
      assert.equal(store.events.get(event.id), event);
      assert.equal(second.title, 'Second Event');
      assert.equal(second.city, 'Abuja');
      assert.equal(second.venue, 'Abuja Hall');
      assert.equal(second.startsAt, '2026-12-06T18:30:00.000Z');
      assert.equal(second.status, 'draft');
      assert.equal(listEventSummaries(store).length, 0);
    });

    it('adds a tier with no tickets sold and reports its full capacity', () => {
      assert.equal(tier.name, 'General');
      assert.equal(tier.priceCents, 2500);
      assert.equal(tier.sold, 0);
      assert.equal(seatsLeft(tier), 3);
      const standard = addTier(store, event.id, {
        name: 'General',
        priceCents: 500000,
        capacity: 100,
      });
      assert.equal(standard.sold, 0);
      assert.equal(seatsLeft(standard), 100);
      throwsCode(() => addTier(store, 'missing-event', { name: 'x', priceCents: 100, capacity: 1 }), 'NOT_FOUND');
    });

    it('publishes a draft event with a tier to the public list', () => {
      assert.equal(event.status, 'draft');
      assert.equal(listEventSummaries(store).length, 0);
      assert.equal(publishEvent(store, event.id).status, 'published');
      assert.deepEqual(listEventSummaries(store).map((summary) => summary.id), [event.id]);
    });

    it('rejects publishing without tiers and leaves the event as a hidden draft', () => {
      const empty = createEvent(store, { title: 'Empty', city: 'Abuja', startsAt: '2026-12-06' });
      throwsCode(() => publishEvent(store, empty.id), 'INVALID_STATE');
      assert.equal(empty.status, 'draft');
      assert.deepEqual(listEventSummaries(store), []);
    });

    it('unpublishes an event with bookings without changing or cancelling them', () => {
      publishEvent(store, event.id);
      const booking = bookTickets(store, tier.id, 'ada', 2);
      const bookingBefore = { ...booking };
      const seatsLeftBefore = seatsLeft(tier);

      assert.deepEqual(listEventSummaries(store).map((summary) => summary.id), [event.id]);
      assert.equal(unpublishEvent(store, event.id).status, 'draft');
      assert.deepEqual(listEventSummaries(store), []);
      assert.equal(findBookingByReference(store, booking.reference), booking);
      assert.deepEqual(booking, bookingBefore);
      assert.equal(booking.status, 'pending');
      assert.equal(seatsLeft(tier), seatsLeftBefore);
      assert.equal(store.bookings.size, 1);
      throwsCode(() => unpublishEvent(store, 'missing-event'), 'NOT_FOUND');
    });
  });

  describe('booking', () => {
    beforeEach(() => publishEvent(store, event.id));

    it('reduces the seats left and prices in whole cents', () => {
      const booking = bookTickets(store, tier.id, 'ada', 2);
      assert.equal(booking.amountCents, 5000);
      assert.equal(booking.status, 'pending');
      assert.equal(seatsLeft(tier), 1);
    });

    it('rejects a booking bigger than the seats left, and changes nothing', () => {
      bookTickets(store, tier.id, 'ada', 2);
      const bookingsBefore = store.bookings.size;
      throwsCode(() => bookTickets(store, tier.id, 'bayo', 2), 'SOLD_OUT');
      assert.equal(seatsLeft(tier), 1);
      assert.equal(store.bookings.size, bookingsBefore);
    });

    it('lets the last ticket be booked, then reports sold out', () => {
      bookTickets(store, tier.id, 'ada', 3);
      assert.equal(seatsLeft(tier), 0);
      throwsCode(() => bookTickets(store, tier.id, 'bayo', 1), 'SOLD_OUT');
    });

    it('validates the quantity', () => {
      const bookingsBefore = store.bookings.size;
      for (const bad of [0, -1, 1.5, 11, '2', undefined]) {
        throwsCode(() => bookTickets(store, tier.id, 'ada', bad), 'VALIDATION');
      }
      assert.equal(seatsLeft(tier), 3);
      assert.equal(store.bookings.size, bookingsBefore);
    });

    it('rejects booking a draft event without changing inventory', () => {
      const draft = createEvent(store, { title: 'Draft', city: 'Lagos', startsAt: '2026-12-07' });
      const draftTier = addTier(store, draft.id, { name: 'General', priceCents: 100, capacity: 2 });
      throwsCode(() => bookTickets(store, draftTier.id, 'ada', 1), 'INVALID_STATE');
      assert.equal(seatsLeft(draftTier), 2);
      assert.equal(store.bookings.size, 0);
    });

    it('finds a booking by its reference code', () => {
      const booking = bookTickets(store, tier.id, 'ada', 1);
      assert.match(booking.reference, /^[A-Z2-9]{8}$/);
      assert.equal(findBookingByReference(store, booking.reference), booking);
      assert.equal(findBookingByReference(store, 'NOPE0000'), undefined);
    });
  });

  describe('cancelling', () => {
    beforeEach(() => publishEvent(store, event.id));

    it('gives the seats back', () => {
      const booking = bookTickets(store, tier.id, 'ada', 2);
      cancelBooking(store, booking.reference);
      assert.equal(seatsLeft(tier), 3);
      assert.equal(booking.status, 'cancelled');
    });

    it('cannot be done twice (seats are released once)', () => {
      const booking = bookTickets(store, tier.id, 'ada', 2);
      cancelBooking(store, booking.reference);
      throwsCode(() => cancelBooking(store, booking.reference), 'INVALID_STATE');
      assert.equal(seatsLeft(tier), 3);
    });
  });

  describe('waitlist', () => {
    beforeEach(() => publishEvent(store, event.id));

    it('only opens when the tier cannot satisfy the request', () => {
      throwsCode(() => joinWaitlist(store, tier.id, 'ada', 1), 'NOT_SOLD_OUT');
      bookTickets(store, tier.id, 'bayo', 3);
      assert.deepEqual(joinWaitlist(store, tier.id, 'ada', 1), { position: 1 });
      assert.deepEqual(joinWaitlist(store, tier.id, 'chidi', 1), { position: 2 });
    });

    it('offers seats first come, first served', () => {
      const booking = bookTickets(store, tier.id, 'bayo', 3);
      joinWaitlist(store, tier.id, 'ada', 1);
      joinWaitlist(store, tier.id, 'chidi', 1);
      assert.equal(offerNextOnWaitlist(store, tier.id), undefined, 'no seats yet');
      cancelBooking(store, booking.reference);
      assert.equal(offerNextOnWaitlist(store, tier.id).userId, 'ada');
      assert.equal(offerNextOnWaitlist(store, tier.id).userId, 'chidi');
    });
  });
});
