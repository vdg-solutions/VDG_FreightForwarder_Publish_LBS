// document-board-composer — port: the document status board's compute (F-03-07). Storage kind
// names are ui vocabulary and stay here, same as shipment-repo.js's own KIND_SHIPMENT.

export const KIND_DOCUMENT = 'document';
export const KIND_SHIPPING_INSTRUCTION = 'shipping_instruction';
export const KIND_ARRIVAL_NOTICE = 'arrival_notice';
export const KIND_RELEASE_ORDER = 'release_order';

let _impl = null;

/// Root bootstrap binds { composeDocumentBoard } once.
export function bindDocumentBoardComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/document-board-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (documents, shippingInstructions, arrivalNotices, releaseOrders) -> { rows, kpis }
export const composeDocumentBoard = (...a) => _i().composeDocumentBoard(...a);
