/**
 * @file
 * x36 - compress and base36 encode arbitrary strings.
 *
 * I had ~100ms decode times with basex-encoder and decided to roll my own using
 * some old code from the distant past. This is a relatively performant (~2ms)
 *
 * @see https://github.com/AshKyd/b36
 */

const COMPRESSION_SCHEME = 'deflate';

function getPonyfill() {
  return import(/* webpackChunkName: "compression-streams-ponyfill" */'compression-streams-polyfill/ponyfill');
}

/** Get a new compression stream (or ponyfilled version for old Safari) */
async function getCompressionStream() {
  if (window.CompressionStream) {
    return new CompressionStream(COMPRESSION_SCHEME);
  }
  console.warn('using CompressionStream ponyfill');
  const ponyfill = await getPonyfill();
  return new (ponyfill.makeCompressionStream(TransformStream))(COMPRESSION_SCHEME);
}

/** Get a new decompression stream (or ponyfilled version for old Safari) */
async function getDecompressionStream() {
  if (window.DecompressionStream) {
    return new DecompressionStream(COMPRESSION_SCHEME);
  }
  console.warn('using DecompressionStream ponyfill');
  const ponyfill = await getPonyfill();
  return new (ponyfill.makeDecompressionStream(TransformStream))(COMPRESSION_SCHEME);
}

/**
 * Encode a string of numbers using a custom base36 encoding.
 * * Strings are chunked into 8 byte base36 encoded pieces for integer safety.
 * * The final piece may not make up 8 bytes, this is picked up by the decoder.
 * @param {string} num  - string full of numeric digits to encode.
 * @return {string}     - base36/alphanumeric encoded string.
 */
function encodeNumber(num) {
  // Keep track of our encoded chunks.
  const encodedChunks = [];

  // Continue until we've processed the entire string.
  while (num.length) {
    // Start somewhere.
    let splitPosition = 7;

    // Try incrementally larger pieces until we get one that's exectly
    // 8 characters long.
    let encodedNum = '';
    do {
      // toString(36) converts decimal to base36.
      // Add a leading 1 for safety, as any leading zeroes would otherwise
      // be lost.
      encodedNum = Number('1' + num.substr(0, ++splitPosition)).toString(36);
    } while (encodedNum.length < 8 && splitPosition < num.length && splitPosition < 15);

    // Push our chunk onto the list of encoded chunks and remove these
    // digits from our string.
    encodedChunks.push(encodedNum);
    num = num.substr(splitPosition);
  }

  // Return a big ol' string.
  return encodedChunks.join('');
};

function encodeArrayBuffer(arrayBuffer) {
  const string = Array.from(arrayBuffer).map(int => String(int).padStart(3, '0')).join('');
  return encodeNumber(string);
}

/**
 * Decode a base36/alphanumeric encoded string back into a long string of decimal numbers.
 * @param {string} input -
 * @returns
 */
function decodeNumber(input) {
  // Split our string into chunks of 8 bytes (with whatever left over at the end)
  return input.match(/.{8}|.+/g).map(function (chunk) {
    // Convert each chunk to base 10.
    // Lop off the first character because it will be a safety 1.
    return String(parseInt(chunk, 36)).substr(1);
  }).join('');
};

function decodeToArrayBuffer(string) {
  const decodedString = decodeNumber(string);
  const array = decodedString.match(/.../g).map(Number);
  const arrayBuffer = new Uint8Array(array);
  return arrayBuffer;
}

/** Convert a stream to a ArrayBuffer */
async function streamToBuffer(stream) {
  const buffers = [];
  const reader = stream.getReader();
  let done = false;
  do {
    const payload = await reader.read();
    if (payload.value) {
      buffers.push(...Array.from(payload.value));
    }
    done = payload.done;
  } while (!done);
  const buffer = new Uint8Array(buffers);
  return buffer;
}

/**
 * Compress a string using deflate
 * @param {string} string
 * @returns {ArrayBuffer}
 */
async function compress(string) {
  const blobStream = new Blob([string], { type: "text/plain" }).stream();
  const compressedStream = blobStream.pipeThrough(await getCompressionStream());
  const buffer = await streamToBuffer(compressedStream);
  return buffer;
}

/**
 * Decompress an ArrayBuffer of deflate compressed data
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
async function decompress(buffer) {
  const decompressedStream = new Blob([buffer])
    .stream()
    .pipeThrough(await getDecompressionStream());

  const decompressedBuffer = await streamToBuffer(decompressedStream);
  const text = new TextDecoder().decode(decompressedBuffer);
  return text;
}

/**
 * Compress and base36 encode an arbitrary string (maybe some json?)
 * @param {string} string - arbitrary text string to encode
 * @returns string
 */
export async function encodeString(string) {
  const compressedBuffer = await compress(string);
  const encodedString = encodeArrayBuffer(compressedBuffer);
  return encodedString;
}

/**
 * Decode and decompress a string encoded with `encodeString`
 * @param {string} string
 * @returns string
 */
export async function decodeString(string) {
  const compressedBuffer = decodeToArrayBuffer(string);
  const decodedString = await decompress(compressedBuffer);
  return decodedString;
}