const react = (msg, reactions, i = 0) => new Promise(resolve => {
	return msg.react(reactions[i]).then(() => {
		if(++i < reactions.length)resolve(react(msg, reactions, i));
			else resolve();
	});
});
module.exports = react;