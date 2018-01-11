const crc = require("crc-32");
module.exports = class {
	constructor() {
		this.info = "Rates anything.";
		this.aliases = ["onascaleof1to10"];
	}
	run(msg, params, flags) {
		const checksum = Math.abs(crc.str(params)).toString();
		let sum = 0;
		for(let i = 0; i < checksum.length; i++){
			sum += checksum[i];
		}
		return `I would rate ${ params } a ${ sum % 11 }/10`;
	}
}