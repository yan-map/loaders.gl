/** @typedef {import('./gltf-attribute-utils')} types */
/** @typedef {import('./gltf-schema').Accessor} GLTFAccessor */
import {getAccessorTypeFromSize, getComponentTypeFromArray} from './gltf-utils'; // TODO - remove

/** @type {types['getGLTFAccessors']} */
export function getGLTFAccessors(attributes) {
  /** @type {{[key: string]: GLTFAccessor}} */
  const accessors = {};
  for (const name in attributes) {
    const attribute = attributes[name];
    if (name !== 'indices') {
      const glTFAccessor = getGLTFAccessor(attribute);
      accessors[name] = glTFAccessor;
    }
  }
  return accessors;
}

/** @type {types['getGLTFAccessor']} */
export function getGLTFAccessor(attribute) {
  const {buffer, size, count} = getAccessorData(attribute);

  const glTFAccessor = {
    // TODO: Deprecate `value` in favor of bufferView?
    value: buffer,
    size, // Decoded `type` (e.g. SCALAR)

    // glTF Accessor values
    // TODO: Instead of a bufferView index we could have an actual buffer (typed array)
    bufferView: undefined,
    byteOffset: 0,
    count,
    type: getAccessorTypeFromSize(size),
    componentType: getComponentTypeFromArray(buffer)
  };

  return glTFAccessor;
}

function getAccessorData(attribute) {
  let buffer = attribute;
  let size = 1;
  let count = 0;

  if (attribute && attribute.value) {
    buffer = attribute.value;
    size = attribute.size || 1;
  }

  if (buffer) {
    if (!ArrayBuffer.isView(buffer)) {
      buffer = toTypedArray(buffer, Float32Array);
    }
    count = buffer.length / size;
  }

  return {buffer, size, count};
}

// Convert non-typed arrays to arrays of specified format
function toTypedArray(array, ArrayType, convertTypedArrays = false) {
  if (!array) {
    return null;
  }
  if (Array.isArray(array)) {
    return new ArrayType(array);
  }
  if (convertTypedArrays && !(array instanceof ArrayType)) {
    return new ArrayType(array);
  }
  return array;
}
