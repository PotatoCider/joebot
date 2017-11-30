const months =  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

exports.resolveDuration = ({ms = 0, s = 0, m = 0, h = 0, d = 0, iso, format = false, yt = false}) => {
	if(iso){
		if(iso[0] !== "P")throw new Error("Invaild params.");
		const time = iso.match(/P(?:(\d*)D)?T(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/);
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
			(d && format.d ? `${d}d ` : "") + 
			(h && format.h ? `${h}h ` : "") + 
			(m && format.m ? `${m}m ` : "") + 
			(s && format.s ? `${s}s ` : "") + 
			(ms && format.ms ? `${ms}ms `: "")
			).slice(0, -1);
	} 
	return { ms, s, m, h, d };
};

exports.resolveDate = iso => {
	if(iso.length > 10)iso = iso.slice(0, 10);
	iso = iso.split("-").reverse();
	iso[0] = ~~iso[0];
	iso[1] = months[~~iso[1]];
	return iso.join(" ");
}