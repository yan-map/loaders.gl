import {fetchFile} from '@loaders.gl/core';
import {KeyError} from 'zarr';
import type {AsyncStore} from 'zarr/types/storage/types';

import {joinUrlParts} from './utils';

export class FetchFileStore implements AsyncStore<ArrayBuffer> {
  constructor(public root: string) {}

  async getItem(key: string, options?: RequestInit): Promise<ArrayBuffer> {
    const filepath = joinUrlParts(this.root, key);
    const response = await fetchFile(filepath, options);
    if (!response.ok) {
      // Zarr requires a special exception to be thrown in case of missing chunks
      throw new KeyError(key);
    }
    const value = await response.arrayBuffer();
    return value;
  }

  async containsItem(key: string): Promise<boolean> {
    const filepath = joinUrlParts(this.root, key);
    const response = await fetchFile(filepath);
    return response.ok;
  }

  async keys(): Promise<string[]> {
    return [];
  }

  setItem(): never {
    throw new Error('setItem not implemented.');
  }

  deleteItem(): never {
    throw new Error('deleteItem not implemented.');
  }
}
