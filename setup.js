try {
	const { prefix, token, yt_api_key } = require("./config.json");
	process.env.PREFIX = prefix;
	process.env.TOKEN = token;
	process.env.YT_API_KEY = yt_api_key;
} catch(e) {
	if(!process.env.TOKEN)throw "Bot token is not specified in config.json or process.env!";
	if(!process.env.YT_API_KEY)throw "Youtube API Key v3 is not specified in config.json or process.env!";
	if(!process.env.PREFIX)throw "Bot prefix is not specified in config.json or process.env!";
}