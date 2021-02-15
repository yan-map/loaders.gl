import * as GLTFSchema from './gltf-schema';

/**
 * Returns a fresh attributes object with glTF-standardized attributes names
 * Attributes that cannot be identified will not be included
 * Removes `indices` if present, as it should be stored separately from the attributes
 */
export function getGLTFAccessors(attributes: {[key: string]: object}): {[key: string]: GLTFSchema.Accessor};

/**
 * Fix up a single accessor.
 * Input: typed array or a partial accessor object
 * Return: accessor object
 */
export function getGLTFAccessor(attribute: object): GLTFSchema.Accessor;
