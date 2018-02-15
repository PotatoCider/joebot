module.exports = class {
	constructor() {
		this.info = "Flips a coin, input a number for x coinflips.";
		this.aliases = ["toss"];
	}

	run(msg, params, flags) {
		return new Promise(resolve => {	
			const param = params.split(" ")[0];
			if(param){
				if(isNaN(param))return resolve("Pls give me a number ;-;");
				if(param > 10000)return resolve("3 much flips 5 me.");
				let heads = 0, tails = 0;
				for(let i = 0; i < param; i++)~~(Math.random()*2) ? heads++ : tails++;
				resolve(`Flipped heads ${ heads } times\nFlipped tails ${ tails } times`);
			}else resolve(process.env.HEADS ? "Heads!" : "Tails!");
		});
	}
};