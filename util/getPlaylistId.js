module.exports = url => {
	const id = url.match(/^(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch|playlist)\?.*&?list=(.+?)(?:&.*)*$/);
	if(id)return id[1];
}