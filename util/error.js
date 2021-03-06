const fs = require("fs");
module.exports = (err, msg, e) => {
	if(!err ||
		err.message === "Provided too few or too many messages to delete. Must provide at least 2 and at most 100 messages to delete." ||
		err.message === "Cannot send an empty message" ||
		err.message === "Unknown Message"
	)return;
	if(err.message === "Privilege is too low..."){
		msg.channel.send(`Cannot ${ e } anyone higher than me.`);
		return true;
	}
	if(err.message === "Invalid Form Body\nnick: Must be 32 or fewer in length."){
		msg.channel.send("Too long nickname.")
		return true;
	}
	if(process.env.PRODUCTION === "TRUE")return console.log(err);
	fs.appendFileSync("log.txt", `${ err.stack || err }\nMessage: ${ err.message }\nCode: ${ err.code }\nDate: ${ Date() }\n\n`);
	console.log("log updated");
	return false;
};