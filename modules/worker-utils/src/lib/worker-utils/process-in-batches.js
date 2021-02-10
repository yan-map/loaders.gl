import WorkerFarm from '../worker-farm/worker-farm';
import {getURLfromWorkerObject} from '../worker-farm/get-worker-url';
import WorkerThread from '../worker-farm/worker-thread';
import {resolvePath} from '@loaders.gl/core/';
import {AsyncQueue} from '../async-queue/async-queue';

// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';

let resultBatchQueue = null;

/**
 * this function expects that the worker function sends certain messages,
 * this can be automated if the worker is wrapper by a call to createWorker in @loaders.gl/worker-utils.
 */
export async function processInBatches(worker, asyncIterator, options = {}) {
  const workerUrl = getURLfromWorkerObject(worker, options);

  // Mark as URL
  const workerSource = `url(${workerUrl})`;

  // Build worker name (for debugger)
  const warning = worker.version !== VERSION ? `(core version ${VERSION})` : '';
  const workerName = `${worker.name}-worker@${worker.version}${warning}`;

  // options.log object contains functions which cannot be transferred
  // TODO - decide how to handle logging on workers
  // TODO - warn if options stringification is long
  options = JSON.parse(JSON.stringify(options));

  const messageData = {
    source: `loaders.gl@${VERSION}`, // Lets worker ignore unrelated messages
    type: 'parse', // TODO - For future extension
    data,
    options
  };

  resultBatchQueue = new AsyncQueue();

  const workerFarm = WorkerFarm.getWorkerFarm(options);
  const workerThread = workerFarm.processSync(workerSource, workerName, messageData);

  // TODO - no flow control...
  for await (const arrayBuffer of asyncIterator) {
    workerThread.postMessage({type: 'input-batch', arrayBuffer});
  }

  /** AsyncQueues are async iterable */
  return resultBatchQueue;
}

function onMessage({type, data, message}) {
  switch (type) {
    case 'process-batch-result';
      resultBatchQueue.enqueue();
      const batch = asyncIterator
      if (batch) {
        workerThread.postMessage({type: 'process-batch', data: batch});
      } else {
        WwrkerThread.postMessage({type: 'process-batch', data: batch});
      }
      break;
    case 'process-batch-done': {
      resultBatchQueue.close(data);
    }
    case 'process-batch-error':
      throw new Error(message);
  }
}
