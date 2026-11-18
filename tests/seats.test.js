import { describe, expect, it } from 'vitest';
import { manualSeatsLeft, onlineSeatsLeft, realSeatsLeft } from '../src/domain/seats.js';

describe('seats left', () => {
  it('uses the real count when no manual figure is set', () => {
    const d = { totalSeats: 40, bookedSeats: 10, onlineSeatCap: null };
    expect(realSeatsLeft(d)).toBe(30);
    expect(manualSeatsLeft(d)).toBeNull();
    expect(onlineSeatsLeft(d)).toBe(30);
  });

  it('shows and sells the manual figure online, going down with bookings', () => {
    // Admin set "4 seats left online" when 10 were booked: cap = 14.
    expect(onlineSeatsLeft({ totalSeats: 40, bookedSeats: 10, onlineSeatCap: 14 })).toBe(4);
    expect(onlineSeatsLeft({ totalSeats: 40, bookedSeats: 12, onlineSeatCap: 14 })).toBe(2);
    expect(onlineSeatsLeft({ totalSeats: 40, bookedSeats: 15, onlineSeatCap: 14 })).toBe(0);
    expect(realSeatsLeft({ totalSeats: 40, bookedSeats: 15 })).toBe(25);
  });

  it('never goes above the real seats left, and works with unlimited departures', () => {
    expect(onlineSeatsLeft({ totalSeats: 12, bookedSeats: 10, onlineSeatCap: 30 })).toBe(2);
    expect(onlineSeatsLeft({ totalSeats: null, bookedSeats: 5, onlineSeatCap: 8 })).toBe(3);
    expect(onlineSeatsLeft({ totalSeats: null, bookedSeats: 5, onlineSeatCap: null })).toBeNull();
  });
});
