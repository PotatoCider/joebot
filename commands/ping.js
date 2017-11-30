let client;
module.exports = class {
	constructor({ client: cli }) {
		client = cli;
		this.info = "Pong!";
	}

	run(msg, params, flags) {
		const start = Date.now();
		msg.channel.send("Pong!").then(m => {
			const elapsed = Date.now() - start;
			m.edit(`Pong! Latency is \`${ elapsed }ms\`, API Latency is \`${ Math.round(client.ping) }ms\`.`)
		});
	}
}