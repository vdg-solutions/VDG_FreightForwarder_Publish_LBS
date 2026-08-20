// compose-ui/storage.js — binds the ui module's storage ports directly to their Drive-backed
// adapters. Unlike the use-case groups (auth, cache, data, …) these front storage/implementations
// itself — there is no wasm export for fx-rate/awb repos, so composeStorageUi() takes no wasm arg.

import { bindFxRateRepo } from '../../implementations/ui/core_abstractions/ports/storage/fx-rate-repo.js';
import { bindAwbRepo } from '../../implementations/ui/core_abstractions/ports/storage/awb-repo.js';
import { FxRateDriveRepo } from '../../implementations/storage/implementations/drive/fx-rate-drive-repo.js';
import { AwbDriveRepo } from '../../implementations/storage/implementations/drive/awb-drive-repo.js';

export function composeStorageUi() {
  bindFxRateRepo(new FxRateDriveRepo());
  bindAwbRepo(new AwbDriveRepo());
}
