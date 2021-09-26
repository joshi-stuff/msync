/**
 * Structure holding information about the status of a target/source mirror.
 *
 * @typedef {Object.<string, FileInfo>} Status
 */

/**
 * Structure holding information about the result of a diff operation.
 *
 * @typedef {Object.<string, Modification>} Comparison
 */

/**
 * Structure holding information about a modification inside the result of a
 * diff operation.
 *
 * @typedef {object} Modification
 * @property {ModificationStatus} status
 * @property {FileInfo} from
 * @property {FileInfo} to
 */

/**
 * Structure holding opaque information about a file status.
 *
 * @typedef {object} FileInfo
 * @property {number} mtime
 * @property {number} size
 * @property {string} header.hash
 */

/**
 * @readonly
 * @enum {string}
 */
const ModificationStatus = {
	ADDED: '+',
	DELETED: '-',
	MODIFIED: 'M',
};

/**
 * Structure holding process files options
 *
 * @typedef {object} ProcessOptions
 * @property {boolean} transcode_flac
 */

// TODO: processor callback
