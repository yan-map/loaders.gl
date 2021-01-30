import fs from 'fs';

/**
 * Returns an async iterator for a stream (works in both Node.js and browsers)
 * @param iterable stream to iterator over
 */
export function makeStream(iterable: AsyncIterable<ArrayBuffer>): ReadableStream | fs.ReadStream;
