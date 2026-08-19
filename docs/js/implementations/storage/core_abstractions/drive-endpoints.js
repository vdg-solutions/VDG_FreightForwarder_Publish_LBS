// drive-endpoints.js — the Drive REST origins the tree helpers address and the shim emulates. A
// relative path handed to the transport is resolved against DRIVE_API_BASE; uploads name their
// own origin (multipart lives on the upload host).

export const DRIVE_API_BASE    = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
