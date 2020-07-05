export {ImageLoader} from './image-loader';
export {ImageWriter} from './image-writer';

// IMAGE CATEGORY API

// Binary Image API
export {getBinaryImageMetadata} from './lib/category-api/binary-image-api';

// Parsed Image API
export {isImageTypeSupported, getDefaultImageType} from './lib/category-api/image-type';

export {
  isImage,
  getImageType,
  getImageSize,
  getImageData,
  getImageDataAsync
} from './lib/category-api/parsed-image-api';

// DEPRECATED
// TODO - Remove in V3
export {loadImage} from './lib/texture-api/load-image';

export {
  isBinaryImage,
  getBinaryImageMIMEType,
  getBinaryImageSize
} from './lib/deprecated/binary-image-api-deprecated';
