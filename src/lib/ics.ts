/**
 * Pure .ics (iCalendar) builder for the 45-minute consultation event.
 * Ghana is UTC+0 year-round, so the selected local slot IS the UTC time.
 */
export function buildConsultIcs(opts: {
  attendeeName: string;
  attendeeEmail: string;
  dateISO: string; // YYYY-MM-DD
  timeHHMM: string; // HH:MM (24h)
}): string {
  const [h, m] = opts.timeHHMM.split(':').map(Number);
  const start = `${opts.dateISO.replace(/-/g, '')}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00Z`;
  const endMinutes = h * 60 + m + 45;
  const end = `${opts.dateISO.replace(/-/g, '')}T${String(Math.floor(endMinutes / 60)).padStart(2, '0')}${String(endMinutes % 60).padStart(2, '0')}00Z`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const uid = `booking-${opts.dateISO}-${opts.timeHHMM.replace(':', '')}-${crypto.randomUUID()}`;
  // iCalendar requires CRLF line endings (RFC 5545 §3.1)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OhWP Studios//Booking//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'SUMMARY:OhWP Studios — Free Consultation',
    'DESCRIPTION:Your free project consultation with OhWP Studios. We will call or send a meeting link before the session.',
    `ORGANIZER;CN=OhWP Studios:mailto:noreply@ohwpstudios.org`,
    `ATTENDEE;CN="${opts.attendeeName.replace(/[\r\n"]/g, '')}";RSVP=TRUE:mailto:${opts.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
