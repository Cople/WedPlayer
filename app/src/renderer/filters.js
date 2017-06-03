export function duration(seconds) {
    if (typeof seconds !== 'number') return '--:--';

    seconds = parseInt(seconds, 10);

    let mins = Math.floor(seconds / 60);
    let secs = seconds % 60;

    if (mins < 10) mins = `0${mins}`;
    if (secs < 10) secs = `0${secs}`;

    return `${mins}:${secs}`;
}
