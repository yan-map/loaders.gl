import {WorkerObject} from '../../types';
/**
 * This function expects that the worker thread sends certain messages,
 * Creating such a worker can be automated if the worker is wrapper by a call to
 * createWorker in @loaders.gl/worker-utils.
 */
export function processInBatches(worker: WorkerObject, data: any): Promise<any>;
