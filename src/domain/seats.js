// Seats left on a fixed-date departure. null = unlimited.
//
// totalSeats is the real capacity. onlineSeatCap (optional, set by the admin as "seats left
// online") caps how many seats in total may be booked through the website; it never allows more
// than the real seats left. The admin panel always works with the real figure.

/** Real seats left (admin view and admin-panel bookings). */
export function realSeatsLeft({ totalSeats, bookedSeats }) {
  return totalSeats == null ? null : Math.max(0, totalSeats - bookedSeats);
}

/** The admin's manual "seats left online", or null when not set. */
export function manualSeatsLeft({ onlineSeatCap, bookedSeats }) {
  return onlineSeatCap == null ? null : Math.max(0, onlineSeatCap - bookedSeats);
}

/** Seats shown and sold on the website: the lower of the real and the manual figure. */
export function onlineSeatsLeft(departure) {
  const real = realSeatsLeft(departure);
  const manual = manualSeatsLeft(departure);
  if (manual == null) return real;
  if (real == null) return manual;
  return Math.min(real, manual);
}
