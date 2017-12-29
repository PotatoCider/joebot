try {
	const { prefix, token, yt_api_key, mongodb_path } = require("./config.json");
	process.env.PREFIX = prefix;
	process.env.TOKEN = token;
	process.env.YT_API_KEY = yt_api_key;
	process.env.MONGODB_URI = mongodb_path;
} catch(e) {
	
} finally {
	const { TOKEN, MONGODB_URI, YT_API_KEY, PREFIX } = process.env;
	if(!TOKEN)throw "Bot token is not specified in config.json or process.env!";
	if(!MONGODB_URI)throw "Mongo Database URL is not specified in config.json or process.env!";
	if(!YT_API_KEY)throw "Youtube API Key v3 is not specified in config.json or process.env!";
	if(!PREFIX)throw "Bot prefix is not specified in config.json or process.env!";

	return true;
}
