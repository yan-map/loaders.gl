export async function* zipBatchIterators(iterator1, iterator2) {
  let batch1 = []; 
  let batch2 = [];
  let iterator1Done = false;
  let iterator2Done = false;

  // TODO - one could let all iterators flow at full speed using `Promise.race`
  // however we might end up with a big temporary buffer
  while (!iterator1Done && !iterator2Done) {
    if (batch1.length === 0 && !iterator1Done) {
      const {value, done} = await iterator1;
      if (done) {
        iterator1Done = true;
      } else {
        batch1 = value;
      }
    } else if (batch2.length === 0 && !iterator2Done) {
      const {value, done} = await iterator2;
      if (done) {
        iterator1Done = true;
      } else {
        batch2 = value;
      }
    }

    const batch = extractBatch(batch1, batch2);
    if (batch) {
      yield batch;
    }
  }
}

function extractBatch(batch1, batch2) {
  const batchLength = Math.min(batch1.length, batch2.length);
  if (batchLength === 0) {
    return null;
  }

  const batch = new Array(batchLength);
  for (let rowIndex = 0; rowIndex < batchLength; ++rowIndex) {
    if (Array.isArray(batch1[rowIndex])) {
      batch[rowIndex] = [...batch1[rowIndex], ...batch2[rowIndex]];
    } else {
      batch[rowIndex] = {...batch1[rowIndex], ...batch2[rowIndex]};
    }
  }
  // Modify the 2 batches
  batch1.splice(0, batchLength);
  batch2.splice(0, batchLength);
  return batch;
}