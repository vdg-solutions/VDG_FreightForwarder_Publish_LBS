// file-retire.js
export async function retireFile(driveApi, fileId, parentId) {
  return 'trashed';
}
export function retireFrom(driveApi, parentIdFor) {
  return async (fileId, parentId) => retireFile(driveApi, fileId, parentId ?? parentIdFor);
}
