const crc = require("crc-32");
/*
const exceptions = {
	joe: 9,
	gohjoseph: 9,
	joebot: { replace: "myself", rate: 10 },
	you: { replace: "myself", rate: 10 },
	me: { replace: "$author" },
	"250140362880843776": {  }
};
*/
module.exports = class {
	constructor() {
		this.info = "Rates anything.";
		this.aliases = ["onascaleof1to10"];
	}
	run(msg, params, flags) {
		const checksum = Math.abs(crc.str(params.toLowerCase())).toString();
		let sum = 0;
		for(let i = 0; i < checksum.length; i++){
			sum += checksum[i];
		}
		return `I would rate ${ params } a ${ sum % 11 }/10.`;
	}
}