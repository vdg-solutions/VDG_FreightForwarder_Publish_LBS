// IATA / flight-no validators — pure functions, null=valid, string=error. (AC-02/AC-03/AC-04)

const IATA3_RE        = /^[A-Z]{3}$/;
const IATA2_RE        = /^[A-Z]{2}$/;
const ICAO_AIRLINE_RE = /^[A-Z]{3}$/;
const ICAO_AIRPORT_RE = /^[A-Z]{4}$/;
const FLIGHT_NO_RE    = /^[A-Z]{2}[0-9]{3,4}$/;

const ERR_IATA3        = '3 uppercase letters, e.g. SGN';
const ERR_IATA2        = '2 uppercase letters, e.g. VN';
const ERR_ICAO_AIRLINE = '3 uppercase letters, e.g. HVN';
const ERR_ICAO_AIRPORT = '4 uppercase letters, e.g. VVTS';
const ERR_FLIGHT_NO    = 'Flight number must follow format: 2-char IATA + 3-4 digits (e.g. VN422)';
const ERR_NAME_REQ     = 'Name is required';

// Returns null on valid, error string on invalid.
export function validateAirportIata(code) {
  return IATA3_RE.test(code) ? null : ERR_IATA3;
}

export function validateAirlineIata(code) {
  return IATA2_RE.test(code) ? null : ERR_IATA2;
}

export function validateAirlineIcao(code) {
  return ICAO_AIRLINE_RE.test(code) ? null : ERR_ICAO_AIRLINE;
}

// Optional field — null/empty is valid
export function validateAirportIcao(code) {
  if (!code) return null;
  return ICAO_AIRPORT_RE.test(code) ? null : ERR_ICAO_AIRPORT;
}

export function validateFlightNo(no) {
  return FLIGHT_NO_RE.test(no) ? null : ERR_FLIGHT_NO;
}

// AC-13: uniqueness guard — returns error string or null
export function checkIataUnique(items, iataCode, skipId = null) {
  const dup = items.find((i) => i.iata_code === iataCode && i.id !== skipId);
  return dup ? `Airport IATA code ${iataCode} already exists` : null;
}

// AC-03: composite validator for AirlineCarrier entity
export function validateAirlineCarrier({ iata_code, icao_code, name }) {
  const e1 = validateAirlineIata(iata_code);
  if (e1) return `IATA code: ${e1}`;
  const e2 = validateAirlineIcao(icao_code);
  if (e2) return `ICAO code: ${e2}`;
  if (!name || !name.trim()) return ERR_NAME_REQ;
  return null;
}
