import { PassThrough } from 'stream';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import merge from 'deepmerge';
import StreamSplitter from './StreamSplitter.js';


export class StreamManager {
	constructor(config) {
		this.config = config;

		this.sourceStreams = {};
		this.activeStreams = {};
	}

	getStream(name, format, quality) {
		let info;
		if (typeof name === "object") {
			info = name;
			name = info.name;
			format = info.format;
			quality = info.quality;
		} else {
			info = this.getStreamSpecificOptions(name, format, quality);
		}

		if (this.activeStreams[name] && this.activeStreams[name][format] && this.activeStreams[name][format][quality]) {
			if (this.activeStreams[name][format][quality].timeout) {
				clearTimeout(this.activeStreams[name][format][quality].timeout);
				delete this.activeStreams[name][format][quality].timeout;
			}
			return this.activeStreams[name][format][quality].stream.getStream();
		}

		if (!this.config.endpoints[name]) {
			return null;
		}

		if (!this.sourceStreams[this.config.endpoints[name].source]) {
			const source = new SourceStream(this.config.endpoints[name].source);
			this.sourceStreams[this.config.endpoints[name].source] = {stream: source};
			this.sourceStreams[this.config.endpoints[name].source].stream.connect();
			source.on("close", () => {
				delete this.sourceStreams[this.config.endpoints[name].source];
			});
			source.on("updateTotalListeners", (listeners) => {
				if (listeners === 0 && info.onDemand) {
					source.disconnect();
				}
					
			});
		}

		this.activeStreams[name] = this.activeStreams[name] || {};
		this.activeStreams[name][format] = this.activeStreams[name][format] || {};
		
		const stream = new ConverterStream(format, info.bitrate);
		this.activeStreams[name][format][quality] = {stream};
		stream.start(this.sourceStreams[this.config.endpoints[name].source].stream.getStream());
		stream.on("close", () => {
			delete this.activeStreams[name][format][quality];
			if (Object.keys(this.activeStreams[name][format]).length === 0) {
				delete this.activeStreams[name][format];
			}
			if (Object.keys(this.activeStreams[name]).length === 0) {
				delete this.activeStreams[name];
			}
		});
		stream.on("updateTotalListeners", (listeners) => {
			if (listeners === 0 && info.onDemand) {
				if (info.noListenersTimeout == 0) {
					stream.stop();
				} else {
					this.activeStreams[name][format][quality].timeout = setTimeout(() => {
						if (stream.getTotalListeners() === 0) {
							stream.stop();
						}
					}, info.noListenersTimeout);
				}
			}
		});
		return stream.getStream();
	}

	getStreamOptions(name) {
		if (!this.config.endpoints[name]) {
			return null;
		}

		return {...merge(this.config.default, this.config.endpoints[name]), name};
	}
	
	getStreamSpecificOptions(name, format, quality) {
		const genericOptions = this.getStreamOptions(name);

		if (!genericOptions) {
			return null;
		}

		if (format === undefined || format === "default") {
			format = genericOptions.defaultCodec;
		}

		if (quality === undefined || quality === "default") {
			quality = genericOptions[format + "Endpoints"].default;
		}

		if (!genericOptions[format + "Endpoints"] || !genericOptions[format + "Endpoints"][quality]) {
			return null;
		}

		let specificOptions = {
			...genericOptions,
			isAllowed: genericOptions["allow" + format.toUpperCase()],
			format,
			quality,
			name,
			bitrate: genericOptions[format.toLowerCase() + "Endpoints"][quality].bitrate,
		};
		return specificOptions;
	}

	static fileTypeToContentType(fileType) {
		switch (fileType) {
			case "mp3":
				return "audio/mpeg";
			case "aac":
				return "audio/aac";
			default:
				return "application/octet-stream";
		}
	}
}

export class SourceStream extends StreamSplitter {
	constructor(source) {
		super();

		this.source = source;

		this.state = "idle";
	}

	async connect() {
		if (this.state !== "idle") {
			return;
		}
		this.state = "connecting";
		this.abortController = new AbortController();
		const response = await fetch(this.source, {
			signal: this.abortController.signal,
		});
		response.body.pipe(this);
		this.state = "connected";
	}

	disconnect() {
		if (this.state === "idle") {
			return;
		}
		this.abortController.abort();
		this.end();
		this.state = "idle";
	}
}

export class ConverterStream extends StreamSplitter {
	constructor(format, bitrate, frequency) {
		super();

		this.format = format;
		this.bitrate = bitrate;
		this.frequency = frequency;
	}
	
	start(originalStream) {
		this.originalStream = originalStream;
		this.ffmpeg = ffmpeg(this.originalStream)
			.audioBitrate(this.bitrate);
		if (this.frequency) {
			this.ffmpeg.audioFrequency(this.frequency);
		}
		if (this.format === "mp3") {
			this.ffmpeg.audioCodec("libmp3lame")
				.format("mp3");
		} else if (this.format === "aac") {
			this.ffmpeg.audioCodec("aac")
				.outputOptions(["-movflags +faststart"])
				.format("adts");
		}
		this.ffmpeg
			.output(this);
		this.ffmpeg.on("error", (err) => {
			if (err.message === "ffmpeg was killed with signal SIGKILL") {
				return;
			}
			console.error(err);
		});
		this.ffmpeg.run();
	}

	stop() {
		if (this.ffmpeg) {
			this.ffmpeg.kill();
		}
		if (this.originalStream) {
			this.originalStream.end();
		}
	}
}