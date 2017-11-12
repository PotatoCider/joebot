const { prefix } = require("../config.json");

exports.getCommand = content => content.startsWith(prefix) ? content.slice(prefix.length, (content.indexOf(" ", prefix.length)+1 || content.length+1)-1) : "";

exports.processMsg = (content, cmd) => {
	const params = content.slice(prefix.length + cmd.length).trim().split(/ +/g);
	const flags = [];
	for(let i = params.length - 1; i >= 0; i--){
		if(params[i].startsWith("--")){
			flags.push(params[i].slice(2));
			params.pop();
		}else break;
	}
	return {
		flags,
		content: params.join(" ")
	};
};