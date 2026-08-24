// output/web/js.tmp/implementations/kernel/core_abstractions/util/iata-validators.js
var IATA3_RE = /^[A-Z]{3}$/;
var IATA2_RE = /^[A-Z]{2}$/;
var ICAO_AIRLINE_RE = /^[A-Z]{3}$/;
var ICAO_AIRPORT_RE = /^[A-Z]{4}$/;
var FLIGHT_NO_RE = /^[A-Z]{2}[0-9]{3,4}$/;
var ERR_IATA3 = "3 uppercase letters, e.g. SGN";
var ERR_IATA2 = "2 uppercase letters, e.g. VN";
var ERR_ICAO_AIRLINE = "3 uppercase letters, e.g. HVN";
var ERR_ICAO_AIRPORT = "4 uppercase letters, e.g. VVTS";
var ERR_FLIGHT_NO = "Flight number must follow format: 2-char IATA + 3-4 digits (e.g. VN422)";
function validateAirportIata(code) {
  return IATA3_RE.test(code) ? null : ERR_IATA3;
}
function validateAirlineIata(code) {
  return IATA2_RE.test(code) ? null : ERR_IATA2;
}
function validateAirlineIcao(code) {
  return ICAO_AIRLINE_RE.test(code) ? null : ERR_ICAO_AIRLINE;
}
function validateAirportIcao(code) {
  if (!code) return null;
  return ICAO_AIRPORT_RE.test(code) ? null : ERR_ICAO_AIRPORT;
}
function validateFlightNo(no) {
  return FLIGHT_NO_RE.test(no) ? null : ERR_FLIGHT_NO;
}
function checkIataUnique(items, iataCode, skipId = null) {
  const dup = items.find((i) => i.iata_code === iataCode && i.id !== skipId);
  return dup ? `Airport IATA code ${iataCode} already exists` : null;
}

export {
  validateAirportIata,
  validateAirlineIata,
  validateAirlineIcao,
  validateAirportIcao,
  validateFlightNo,
  checkIataUnique
};
