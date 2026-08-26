import {
  dateFrom,
  nowDate
} from "./chunk-MGTH6QM4.js";

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
