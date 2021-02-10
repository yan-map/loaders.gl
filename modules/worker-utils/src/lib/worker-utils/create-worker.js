/* eslint-disable no-restricted-globals */
/* global self */

import {AsyncQueue} from "@loaders.gl/tables";

let batchQueue;
let options;

export function createWorker(process, processInBatches) {
  // Check that we are actually in a worker thread
  if (typeof self === 'undefined') {
    return;
  }

  self.onmessage = async message => {
    const {type, data} = message;

    if (!isKnownMessage(data)) {
      return;
    }

    // @ts-ignore self is WorkerGlobalScope
    const sendResponse = (message) => self.postMessage(message);

    switch(type) {
      case 'process':
        try {
          if (!process) {
            // TODO create a single batch and fall back to batched parsing?
            throw new Error('Worker does not support atomic processing');
          }
          const result = await process(message.data);
          sendResponse({type: 'process-done', result});
        } catch (error) {
          // @ts-ignore self is WorkerGlobalScope
          sendResponse({type: 'process-error', message: error.message});
        }
        break;

      case 'process-in-batches':
        batchQueue = new AsyncQueue();
        options = data.options || {};
        if (!processInBatches) {
          throw new Error('Worker does not support batched processing');
        }
        try {
          const resultIterator = processInBatches(batchQueue, options);
          for await (const batch of resultIterator) {
            sendResponse({type: 'process-batch-result'});
          }
          sendResponse({type: 'process-batch-done'});
        } catch (error) {
          // @ts-ignore self is WorkerGlobalScope
          sendResponse({type: 'process-batch-error', message: error.message});
        }
        break;

      case `process-batch`:
        batchQueue.enqeue(data.data);
        break;
      case 'process-batch-end':
        batchQueue.close();
        break;
    }
  };
}

// Filter out noise messages sent to workers
function isKnownMessage(data, type = 'parse') {
  return data && data.type === type && data.source && data.source.startsWith('loaders.gl');
}
