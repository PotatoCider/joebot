const months =  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

exports.resolveDuration = ({ms = 0, s = 0, m = 0, h = 0, d = 0, iso, format = false, yt = false}) => {
	if(iso){
		const time = iso.match(/P(?:(\d*)D)?T(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/);
		if(!time)throw new Error("Invaild params.");
		d = ~~time[1] || 0;
		h = ~~time[2] || 0;
		m = ~~time[3] || 0;
		s = ~~time[4] || 0;
	}else{
		s += ~~(ms / 1000);
		ms %= 1000;
		m += ~~(s / 60);
		s %= 60;
		h += ~~(m / 60);
		m %= 60;
		d += ~~(h / 24);
		h %= 24;
	}
	if(yt){
		if(d)h += d * 24;
		if(s < 10)s = "0" + s;
		if(h && m < 10)m = "0" + m;
		return (h ? h + ":" : "") + m + ":" + s;
	}
	if(format){
		return (
			(format.d && d ? `${d}d ` : "") + 
			(format.h && h ? `${h}h ` : "") + 
			(format.m && m ? `${m}m ` : "") + 
			(format.s && s ? `${s}s ` : "") + 
			(format.ms && ms ? `${ms}ms `: "")
			).slice(0, -1)
	}
	return { ms, s, m, h, d };
};

exports.resolveIsoDate = iso => {
	let [ _, y, mm, d, h, m ] = iso.match(/(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):\d\d\.\d{3}Z/),
		suffix = "am";

	h = ~~h;
	if(h >= 12)suffix = "pm";
	if(h > 12)h -= 12;

	d = ~~d;
	mm = months[mm - 1];

	return d + " " + mm + " " + y + " at " + h + ":" + m + suffix;
}