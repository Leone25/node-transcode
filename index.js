import config from "./config.js";


import express from "express";

import {StreamManager} from "./StreamManager.js";

const app = express();
const streamManager = new StreamManager(config);

if (config.statusPage) {
	app.get("/", (req, res) => {
		res.send("OK");
	});
}

app.get("favicon.ico", (req, res) => {
	res.status(404).send("Not Found");
});

app.get(/^\/(\w+)(\/\w+)?(\.\w+)*$/, (req, res) => {
	let name = req.params[0];
	let format = req.params[2] ? req.params[2].substring(1) : undefined;
	let quality = req.params[1] ? req.params[1].substring(1) : undefined;
	const info = streamManager.getStreamSpecificOptions(name, format, quality);
	if (!info) {
		res.status(404).send("Not Found");
		return;
	}
	res.setHeader("Content-Type", StreamManager.fileTypeToContentType(info.format));
	res.setHeader("Cache-Control", "no-store, no-cache, private");
	res.setHeader("Expires", "0");
	res.setHeader("Pragma", "no-cache");
	const stream = streamManager.getStream(info);
	stream.pipe(res);
	res.on("close", () => {
		stream.destroy();
	});
});

app.all("*", (req, res) => {
	res.status(404).send("Not Found");
});

app.listen(config.port, () => {
	console.log(`Listening on port ${config.port}`);
});