// compose.js — the kernel module's composition root: every platform port in core_abstractions gets
// its browser adapter here, at module load, so the helpers (safe-await, today-local, i18n, the
// session guards) find their ports bound before any other module evaluates. The root bootstrap
// imports this first.

import { bindClock } from '../core_abstractions/ports/clock.js';
import { bindTimer } from '../core_abstractions/ports/timer.js';
import { bindLog } from '../core_abstractions/ports/log.js';
import { bindKeyValueStore } from '../core_abstractions/ports/key-value.js';
import { bindHttp } from '../core_abstractions/ports/http.js';
import { bindAppEvents } from '../core_abstractions/ports/app-events.js';
import { bindVisibility } from '../core_abstractions/ports/visibility.js';
import { bindBase64 } from '../core_abstractions/ports/base64.js';
import { bindWasmFormat } from '../core_abstractions/ports/wasm-format.js';
import { bindGrid } from '../core_abstractions/ports/grid.js';

import { browserClock, browserTimer, consoleLog, localStorageKv, fetchHttp, windowEvents,
  documentVisibility, base64Codec, wasmFormatter, agGridHost } from '../implementations/browser-platform.js';

bindClock(browserClock);
bindTimer(browserTimer);
bindLog(consoleLog);
bindKeyValueStore(localStorageKv);
bindHttp(fetchHttp);
bindAppEvents(windowEvents);
bindVisibility(documentVisibility);
bindBase64(base64Codec);
bindWasmFormat(wasmFormatter);
bindGrid(agGridHost);
