import {assert} from '@loaders.gl/loader-utils';
import {isAsyncIterable, isReadableStream} from '../../javascript-utils/is-type';
import {asyncIteratorToStream} from './async-iterator-to-stream';

/**
 * Returns an iterator that breaks its input into chunks and yields them one-by-one.
 *
 * @param data a big `ArrayBuffer`, `Blob` or string, or a stream.
 * @param {object} options
 * @param {number} [options.chunkSize]  max number of bytes per chunk. chunkSize is ignored for streams.
 * @returns iterator or async iterator that yields chunks of specified size.
 *
 * This function can e.g. be used to enable data sources that can only be read atomically
 * (such as `Blob` and `File` via `FileReader`) to still be parsed in batches.
 */
export function makeReadableStream(data, options = {}) {
  if (isAsyncIterable(data)) {
    // Note: Converts string chunks to binary
    return asyncIteratorToStream.obj(data, options);
  }
  if (isReadableStream(data)) {
    return data;
  }
  return assert(false);
}
