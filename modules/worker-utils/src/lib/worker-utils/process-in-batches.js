import WorkerFarm from '../worker-farm/worker-farm';
import {getURLfromWorkerObject} from '../worker-farm/get-worker-url';
import WorkerThread from '../worker-farm/worker-thread';
import {resolvePath} from '@loaders.gl/core/';
import {AsyncQueue} from '@loaders.gl/tables/';

// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';

/**
 * this function expects that the worker function sends certain messages,
 * this can be automated if the worker is wrapper by a call to createWorker in @loaders.gl/worker-utils.
 */
export async function processOnWorker(worker, asyncIterator, options = {}) {
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

  const workerFarm = WorkerFarm.getWorkerFarm(options);
  const workerThread = workerFarm.processSync(workerSource, workerName, messageData);

  for await (const arrayBuffer of asyncIterator) {
    workerThread.postMessage({type: 'input-batch', arrayBuffer});
  }
}

function onMessage({type, data}) {
  switch (type) {
    case 'worker-started':
    case 'input-batch-result';
      const batch = getNextBatch(asyncIterator);
      if (batch) {
        WorkerThread.postMessage({type: 'input-batch', data: batch});
      } else {
        WorkerThread.postMessage({type: 'input-exhausted', data: batch});
      }
      break;
    case 'worker-done': {
      AsyncQueue.push(data);
    }
    case 'worker-error':
      reject(data);
      break;
  }
}
