// compose-ui/storage.js — binds the ui module's storage ports directly to their Drive-backed
// adapters. Unlike the use-case groups (auth, cache, data, …) these front storage/implementations
// itself — there is no wasm export for fx-rate/awb repos, so composeStorageUi() takes no wasm arg.

import { bindFxRateRepo } from '../../implementations/ui/core_abstractions/ports/storage/fx-rate-repo.js';
import { bindAwbRepo } from '../../implementations/ui/core_abstractions/ports/storage/awb-repo.js';
import { FxRateStoreRepo as FxRateDriveRepo } from '../../implementations/storage/implementations/repos/fx-rate-repo.js';
import { AwbStoreRepo as AwbDriveRepo } from '../../implementations/storage/implementations/repos/awb-repo.js';

export function composeStorageUi() {
  bindFxRateRepo(new FxRateDriveRepo());
  bindAwbRepo(new AwbDriveRepo());
}
