module.exports = () => {
	const letters = "0123456789abcdef";
	let color = "#"; // ITS COLOUR NOT COLOR
	for(let i = 0; i < 6; i++)color += letters[~~(Math.random() * 16)];
	return color;
};