import { PassThrough, Writable } from 'stream';

class StreamSplitter extends Writable {
	constructor() {
		super();
		this.streams = [];
	}

	_write(chunk, encoding, callback) {
		this.streams.forEach((stream) => {
			stream.write(chunk);
		});
		callback();
	}

	_destroy(err, callback) {
		this.streams.forEach((stream) => {
			stream.destroy();
		});
		callback();
	}

	/**
	 * @description This will return a new clone of the original stream which can be piped to wherever needed
	 */
	getStream() {
		let stream = new PassThrough();
		this.streams.push(stream);
		stream.on('close', () => {
			this.streams.splice(this.streams.indexOf(stream), 1);
			this.emit('updateTotalListeners', this.getTotalListeners());
		});
		this.emit('updateTotalListeners', this.getTotalListeners());
		return stream;
	}

	getTotalListeners() {
		return this.streams.length;
	}
}

export default StreamSplitter;