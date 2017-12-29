exports.getCommand = (content, prefix) => content.startsWith(prefix) ? content.slice(prefix.length, ~(~content.indexOf(" ", prefix.length) || ~content.length)) : "";

exports.processMsg = (content, cmd, prefix) => {
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