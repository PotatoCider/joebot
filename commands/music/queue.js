
module.exports = class {
	constructor() {
		this.aliases = ["q"];
	}
	
	run(music) {
		const { queue, np } = music;
		let message = 
			(np ? `**Now playing**: **\`${ np.title }\` by** ${ np.channelTitle }\n\n` : "") + 
			(queue.length ? "" : "Queue is empty.");
		for(let i = 0; i < queue.length; i++){
			const vid = queue[i];
			message += `**${ i+1 }**: **\`${ vid.title }\` by** ${ vid.channelTitle }\n`;
		}
		return message;
	}
}