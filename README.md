# Node Transcode

A simple (and basic) transcoding server built with Node.js and FFmpeg.

It takes one or multiple http(s) streams and converts them to different formats(mp3 and aac) at different bitrates.

## Why?

Because my "smart" TV doesn't support some audio formats and I wanted to be able to listen to my favorite radio stations on it.

## Features

- [x] Single source stream, the data will be requested from the upstream server only once.
- [x] Mp3 and AAC transcoding.
- [x] Multiple bitrates for each format.
- [x] Simple and easy to setup and use.

## Installation

1. Clone the repository
2. Install the dependencies with `npm install`
3. Copy the `config.js.example` file to `config.js` and set the desired configuration (see comments in config file for more information)
4. Run the server with `node index.js` (or with pm2 with `pm2 start index.js --name node-transcode`)

## Usage

Once you have the server running, you can access the transcoded streams by using the following URL format:

`http://<server-ip>:<port>/<endpoint>[/<quality>][.<format>]`

Where:
- `<server-ip>` is the IP address of the server where the transcoding server is running.
- `<port>` is the port where the server is listening.
- `<endpoint>` is the name of the endpoint you want to transcode (this is defined in the `config.js` file).
- `<quality>` (optional) is the quality of the transcoded stream (this is defined in the `config.js` file).
- `<format>` (optional) is the format of the transcoded stream (this is defined in the `config.js` file).

## To Do

- [ ] Better logging and error handling.
- [ ] Add option to change sample rate and number of channels.
- [ ] Add support for more formats and codecs. Mainly ogg, flac, and opus.
- [ ] Add hls support.
- [ ] Add autostart (for sources that are not on-demand) and autorestart scripts.
- [ ] Add support for more configuration options (like authentication, etc).
- [ ] Other ideas? Feel free to open an issue or a PR!

Everyone is welcome to contribute to this project! Just open an issue or a PR so we can discuss it.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.