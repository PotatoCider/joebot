let resolveTime;
module.exports = resolveTime = ({ms = 0, s = 0, m = 0, h = 0, d = 0, format = false}) => {
	s += ~~(ms / 1000);
	ms %= 1000;
	m += ~~(s / 60);
	s %= 60;
	h += ~~(m / 60);
	m %= 60;
	d += ~~(h / 24);
	h %= 24;
	if(format){
		return (
			(d && format.d ? `${d}d ` : "") + 
			(h && format.h ? `${h}h ` : "") + 
			(m && format.m ? `${m}m ` : "") + 
			(s && format.s ? `${s}s ` : "") + 
			(ms && format.ms ? `${ms}ms `: "")
			).slice(0, -1);
	} 
	return {ms:ms, s:s, m:m, h:h, d:d};
};