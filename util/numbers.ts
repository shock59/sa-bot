/**
 * `x**y`
 *
 * @author zakariamouhid [`bigIntPow`](https://gist.github.com/ryansmith94/91d7fd30710264affeb9#gistcomment-3136187)
 *
 * @param one `x`.
 * @param two `y`.
 *
 * @returns Return value.
 */
export function bigIntPower(one: bigint, two: bigint): bigint {
	if (two === 0n) return 1n;
	const powerTwo = bigIntPower(one, two / 2n);
	if (two % 2n === 0n) return powerTwo * powerTwo;
	return one * powerTwo * powerTwo;
}

/**
 * Convert a number between bases.
 *
 * @author zakariamouhid [`convertBaseBigInt `](https://gist.github.com/ryansmith94/91d7fd30710264affeb9#gistcomment-3136187)
 *
 * @param value - The number to convert.
 * @param sourceBase - The base of the input number.
 * @param outBase - The base of the output number.
 * @param chars - The character set to use.
 */
export function convertBase(
	value: string,
	sourceBase: number,
	outBase: number,
	chars = convertBase.defaultChars,
) {
	const range = [...chars];
	if (sourceBase < 2 || sourceBase > range.length)
		throw new RangeError(`sourceBase must be between 2 and ${range.length}`);
	if (outBase < 2 || outBase > range.length)
		throw new RangeError(`outBase must be between 2 and ${range.length}`);

	const outBaseBig = BigInt(outBase);

	let decValue = [...value]
		.reverse() // Stop changing this to `.reduceRight()`! It’s not the same!
		.reduce((carry, digit, loopIndex) => {
			const biggestBaseIndex = range.indexOf(digit);
			if (biggestBaseIndex === -1 || biggestBaseIndex > sourceBase - 1)
				throw new ReferenceError(`Invalid digit ${digit} for base ${sourceBase}.`);
			return (
				carry +
				BigInt(biggestBaseIndex) * bigIntPower(BigInt(sourceBase), BigInt(loopIndex))
			);
		}, 0n);

	let output = "";
	while (decValue > 0) {
		output = `${range[Number(decValue % outBaseBig)]}${output}`;
		decValue = (decValue - (decValue % outBaseBig)) / outBaseBig;
	}
	return output || "0";
}

convertBase.defaultChars =
	// eslint-disable-next-line unicorn/string-content
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/=[];',.";
convertBase.MAX_BASE = convertBase.defaultChars.length;

/**
 * Adds a numerical suffix to a number.
 *
 * @param number - The number to suffix.
 * @param options - Options.
 * @param options.bold - Whether to bold the output using Markdown.
 * @param options.jokes - Toggle jokes after the number.
 */
export function nth(number: number) {
	return (
		number.toLocaleString("en-us") +
		([undefined, "st", "nd", "rd"][(((number + 90) % 100) - 10) % 10] ?? "th")
	);
}

export function parseTime(time: string): Date {
	const number = Number(time);

	if (!Number.isNaN(number)) {
		if (number > 1_000_000_000_000) return new Date(number);
		else if (number > 1_000_000_000) return new Date(number * 1000);
		else return new Date(Date.now() + number * 3_600_000);
	}

	const {
		years = 0,
		months = 0,
		weeks = 0,
		days = 0,
		hours = 0,
		minutes = 0,
		seconds = 0,
	} = time.match(
		new RegExp(
			/^\s*(?:(?<years>.\d+|\d+(?:.\d+)?)\s*y(?:(?:ea)?rs?)?\s*)?\s*/.source +
				/(?:(?<months>.\d+|\d+(?:.\d+)?)\s*mo?n?ths?\s*)?\s*/.source +
				/(?:(?<weeks>.\d+|\d+(?:.\d+)?)\s*w(?:(?:ee)?ks?)?\s*)?\s*/.source +
				/(?:(?<days>.\d+|\d+(?:.\d+)?)\s*d(?:ays?)?\s*)?\s*/.source +
				/(?:(?<hours>.\d+|\d+(?:.\d+)?)\s*h(?:(?:ou)?rs?)?\s*)?\s*/.source +
				/(?:(?<minutes>.\d+|\d+(?:.\d+)?)\s*m(?:in(?:ute)?s?)?)?\s*/.source +
				/(?:(?<seconds>.\d+|\d+(?:.\d+)?)\s*s(?:ec(?:ond)?s?)?)?\s*$/.source,
			"i",
		),
	)?.groups ?? {};

	const date = new Date();
	const otherDate = new Date(date);

	date.setUTCFullYear(date.getUTCFullYear() + +years);
	otherDate.setUTCFullYear(otherDate.getUTCFullYear() + Math.ceil(+years));
	const fractionalYears = (+otherDate - +date) * (+years % 1);

	date.setUTCMonth(date.getUTCMonth() + +months);
	otherDate.setUTCFullYear(date.getUTCFullYear(), otherDate.getUTCMonth() + Math.ceil(+months));
	const fractionalMonths = (+otherDate - +date) * (+months % 1);

	const totalDays = +weeks * 7 + +days;
	const totalHours = totalDays * 24 + +hours;
	const totalMinutes = totalHours * 60 + +minutes;
	const totalSeconds = totalMinutes * 60 + +seconds;

	return new Date(+date + fractionalYears + fractionalMonths + totalSeconds * 1000);
}

export function lerpColors(colors: number[], percent: number) {
	if (colors.length === 0) throw new RangeError("Color array must not be empty.");
	if (colors.length === 1) return colors[0];

	const segmentCount = colors.length - 1;
	const segmentIndex = Math.floor(segmentCount * percent);
	const segmentPercent =
		segmentCount === 1 ? percent : (percent - segmentIndex / segmentCount) * segmentCount;

	const color1 = colors[segmentIndex] ?? 0;
	const color2 = colors[segmentIndex + 1] ?? 0;

	const red1 = (color1 >> 16) & 0xff;
	const green1 = (color1 >> 8) & 0xff;
	const blue1 = color1 & 0xff;

	const red2 = (color2 >> 16) & 0xff;
	const green2 = (color2 >> 8) & 0xff;
	const blue2 = color2 & 0xff;

	const red = Math.round(red1 + (red2 - red1) * segmentPercent);
	const green = Math.round(green1 + (green2 - green1) * segmentPercent);
	const blue = Math.round(blue1 + (blue2 - blue1) * segmentPercent);

	return (red << 16) | (green << 8) | blue;
}
