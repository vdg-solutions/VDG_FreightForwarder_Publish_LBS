import {
  dateFrom,
  nowDate
} from "./chunk-YMZ4K7MJ.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/today-local.js
var ISO_DATE_LOCALE = "en-CA";
function todayLocal(date = nowDate()) {
  return date.toLocaleDateString(ISO_DATE_LOCALE);
}
function toLocalDateStr(value) {
  return todayLocal(value instanceof Date ? value : dateFrom(value));
}

export {
  todayLocal,
  toLocalDateStr
};
