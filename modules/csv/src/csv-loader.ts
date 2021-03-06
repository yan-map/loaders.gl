import type {LoaderWithParser} from '@loaders.gl/loader-utils';
// import type {Schema} from '@loaders.gl/schema';
type Schema = any;

import {AsyncQueue, TableBatchBuilder, RowTableBatch} from '@loaders.gl/schema';
import Papa from './libs/papaparse';
import AsyncIteratorStreamer from './lib/async-iterator-streamer';

// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';

const ROW_FORMAT_OPTIONS = {
  OBJECT: 'object',
  ARRAY: 'array'
};

export type CSVLoaderOptions = {
  TableBatch?: any;
  batchSize?: number | 'auto';
  optimizeMemoryUsage?: boolean;
  // CSV options
  header?: 'auto';
  rowFormat?: 'object' | 'array';
  columnPrefix?: string;
  // delimiter: auto
  // newline: auto
  quoteChar?: string;
  escapeChar?: string;
  dynamicTyping?: boolean;
  comments?: boolean;
  skipEmptyLines?: boolean;
  // transform: null?
  delimitersToGuess?: string[];
  // fastMode: auto
};

const DEFAULT_CSV_LOADER_OPTIONS: {csv: CSVLoaderOptions} = {
  csv: {
    TableBatch: RowTableBatch,
    batchSize: 10,
    optimizeMemoryUsage: false,
    // CSV options
    header: 'auto',
    rowFormat: 'object',
    columnPrefix: 'column',
    // delimiter: auto
    // newline: auto
    quoteChar: '"',
    escapeChar: '"',
    dynamicTyping: true,
    comments: false,
    skipEmptyLines: false,
    // transform: null?
    delimitersToGuess: [',', '\t', '|', ';']
    // fastMode: auto
  }
};

export const CSVLoader: LoaderWithParser = {
  id: 'csv',
  name: 'CSV',
  version: VERSION,
  extensions: ['csv'],
  mimeTypes: ['text/csv'],
  category: 'table',
  parse: async (arrayBuffer, options) => parseCSV(new TextDecoder().decode(arrayBuffer), options),
  parseText: parseCSV,
  parseInBatches: parseCSVInBatches,
  // @ts-ignore
  testText: null,
  options: DEFAULT_CSV_LOADER_OPTIONS
};

async function parseCSV(csvText, options) {
  // Apps can call the parse method directly, we so apply default options here
  options = {...options};
  options.csv = {...DEFAULT_CSV_LOADER_OPTIONS.csv, ...options.csv};

  const {rowFormat} = options.csv;
  if (!Object.values(ROW_FORMAT_OPTIONS).includes(rowFormat)) {
    throw new Error(
      `Invalid option ${rowFormat} for rowFormat. Valid values are 'object' or 'array'`
    );
  }

  const firstRow = readFirstRow(csvText);
  const header: boolean =
    options.csv.header === 'auto' ? isHeaderRow(firstRow) : Boolean(options.csv.header);

  const parseWithHeader = rowFormat === ROW_FORMAT_OPTIONS.OBJECT && header;

  const config = {
    dynamicTyping: true, // Convert numbers and boolean values in rows from strings
    ...options.csv,
    header: parseWithHeader,
    download: false, // We h andle loading, no need for papaparse to do it for us
    transformHeader: parseWithHeader ? duplicateColumnTransformer() : undefined,
    error: (e) => {
      throw new Error(e);
    }
  };

  const result = Papa.parse(csvText, config);

  if (rowFormat === 'object' && !header) {
    // If the dataset has no header, transform the array result into an object shape with an
    // autogenerated header
    const headerRow = generateHeader(options.csv.columnPrefix, firstRow.length);
    return result.data.map((row) =>
      row.reduce((acc, value, i) => {
        acc[headerRow[i]] = value;
        return acc;
      }, {})
    );
  }
  return result.data;
}

// TODO - support batch size 0 = no batching/single batch?
function parseCSVInBatches(asyncIterator, options) {
  // Apps can call the parse method directly, we so apply default options here
  options = {...options};
  options.csv = {...DEFAULT_CSV_LOADER_OPTIONS.csv, ...options.csv};

  const {batchSize, optimizeMemoryUsage} = options.csv;
  const TableBatchType = options.csv.TableBatch;

  const asyncQueue = new AsyncQueue();

  const {rowFormat} = options.csv;
  if (!Object.values(ROW_FORMAT_OPTIONS).includes(rowFormat)) {
    throw new Error(
      `Invalid option ${rowFormat} for rowFormat. Valid values are 'object' or 'array'`
    );
  }

  const convertToObject = rowFormat === ROW_FORMAT_OPTIONS.OBJECT;

  let isFirstRow: boolean = true;
  let headerRow: string[] | null = null;
  let tableBatchBuilder: TableBatchBuilder | null = null;
  let schema: Schema | null = null;

  const config = {
    dynamicTyping: true, // Convert numbers and boolean values in rows from strings,
    ...options.csv,
    header: false, // Unfortunately, header detection is not automatic and does not infer types
    download: false, // We handle loading, no need for papaparse to do it for us
    // chunkSize is set to 5MB explicitly (same as Papaparse default) due to a bug where the
    // streaming parser gets stuck if skipEmptyLines and a step callback are both supplied.
    // See https://github.com/mholt/PapaParse/issues/465
    chunkSize: 1024 * 1024 * 5,
    // skipEmptyLines is set to a boolean value if supplied. Greedy is set to true
    // skipEmptyLines is handled manually given two bugs where the streaming parser gets stuck if
    // both of the skipEmptyLines and step callback options are provided:
    // - true doesn't work unless chunkSize is set: https://github.com/mholt/PapaParse/issues/465
    // - greedy doesn't work: https://github.com/mholt/PapaParse/issues/825
    skipEmptyLines: false,

    // step is called on every row
    step(results) {
      const row = results.data;

      if (options.csv.skipEmptyLines) {
        // Manually reject lines that are empty
        const collapsedRow = row.flat().join('').trim();
        if (collapsedRow === '') {
          return;
        }
      }
      const bytesUsed = results.meta.cursor;

      // Check if we need to save a header row
      if (isFirstRow && !headerRow) {
        // Auto detects or can be forced with options.csv.header
        const header =
          options.csv.header === 'auto' ? isHeaderRow(row) : Boolean(options.csv.header);
        if (header) {
          headerRow = row.map(duplicateColumnTransformer());
          return;
        }
      }

      // If first data row, we can deduce the schema
      if (isFirstRow) {
        isFirstRow = false;
        if (!headerRow) {
          headerRow = generateHeader(options.csv.columnPrefix, row.length);
        }
        schema = deduceSchema(row, headerRow);
      }

      // Add the row
      tableBatchBuilder =
        tableBatchBuilder ||
        new TableBatchBuilder(TableBatchType, schema, {
          batchSize,
          convertToObject,
          optimizeMemoryUsage
        });

      tableBatchBuilder.addRow(row);
      // If a batch has been completed, emit it
      if (tableBatchBuilder.isFull()) {
        asyncQueue.enqueue(tableBatchBuilder.getBatch({bytesUsed}));
      }
    },

    // complete is called when all rows have been read
    complete(results) {
      const bytesUsed = results.meta.cursor;
      // Ensure any final (partial) batch gets emitted
      const batch = tableBatchBuilder && tableBatchBuilder.getBatch({bytesUsed});
      if (batch) {
        asyncQueue.enqueue(batch);
      }
      asyncQueue.close();
    }
  };

  Papa.parse(asyncIterator, config, AsyncIteratorStreamer);

  // TODO - Does it matter if we return asyncIterable or asyncIterator
  // return asyncQueue[Symbol.asyncIterator]();
  return asyncQueue;
}

/**
 * Checks if a certain row is a header row
 * @param row the row to check
 * @returns true if the row looks like a header
 */
function isHeaderRow(row: string[]): boolean {
  return row && row.every((value) => typeof value === 'string');
}

/**
 * Reads, parses, and returns the first row of a CSV text
 * @param csvText the csv text to parse
 * @returns the first row
 */
function readFirstRow(csvText: string): any[] {
  const result = Papa.parse(csvText, {
    download: false,
    dynamicTyping: true,
    preview: 1
  });
  return result.data[0];
}

/**
 * Creates a transformer that renames duplicate columns. This is needed as Papaparse doesn't handle
 * duplicate header columns and would use the latest occurrence by default.
 * See the header option in https://www.papaparse.com/docs#config
 * @returns a transform function that returns sanitized names for duplicate fields
 */
function duplicateColumnTransformer() {
  const observedColumns = new Set();
  return (col) => {
    let colName = col;
    let counter = 1;
    while (observedColumns.has(colName)) {
      colName = `${col}.${counter}`;
      counter++;
    }
    observedColumns.add(colName);
    return colName;
  };
}

/**
 * Generates the header of a CSV given a prefix and a column count
 * @param columnPrefix the columnPrefix to use
 * @param count the count of column names to generate
 * @returns an array of column names
 */
function generateHeader(columnPrefix: string, count: number = 0): string[] {
  const headers: string[] = [];
  for (let i = 0; i <= count; i++) {
    headers.push(`${columnPrefix}${i + 1}`);
  }
  return headers;
}

function deduceSchema(row, headerRow) {
  const schema = headerRow ? {} : [];
  for (let i = 0; i < row.length; i++) {
    const columnName = (headerRow && headerRow[i]) || i;
    const value = row[i];
    switch (typeof value) {
      case 'number':
      case 'boolean':
        // TODO - booleans could be handled differently...
        schema[columnName] = {name: String(columnName), index: i, type: Float32Array};
        break;
      case 'string':
      default:
        schema[columnName] = {name: String(columnName), index: i, type: Array};
      // We currently only handle numeric rows
      // TODO we could offer a function to map strings to numbers?
    }
  }
  return schema;
}
