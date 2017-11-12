module.exports = (msg, user, opts, ...emojis) => {
	const self = new Promise(resolve => {
		emojis = [].concat(...emojis);
		const collector = msg.createReactionCollector(
			(r, u) => emojis.includes(r.emoji.name) && u.id === user.id,
			typeof opts === "number" ? { time: opts } : opts
		).once("collect", reaction => {
			resolve(reaction);
			self.resolved = true;
			collector.stop();
		});
		setImmediate(() => self.collector = collector);
	});
	return self;
};