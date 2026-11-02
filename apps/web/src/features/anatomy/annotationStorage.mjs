import {SOURCE_COMMIT, parseDocument, validateDocument} from './annotationSchema.mjs';
export const draftKey = userId => `medcoel:anatomy-annotations:v1:${encodeURIComponent(userId)}:${SOURCE_COMMIT}:Humerus.r`;
export function loadDraft(storage,userId,fallback) {
 const text=storage.getItem(draftKey(userId));
 return text ? parseDocument(text) : globalThis.structuredClone(validateDocument(fallback));
}
export function storeDraft(storage,userId,document) {
 storage.setItem(draftKey(userId),JSON.stringify(validateDocument(document)));
}
export function exportFilename(document) {
 validateDocument(document);return `humerus.r.v${document.schemaVersion}.rev-${document.revision}.json`;
}
