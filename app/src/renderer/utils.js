import fs from 'fs';
import path from 'path';
import { remote } from 'electron';
import jsmediatags from 'jsmediatags';
import mm from 'musicmetadata';
import * as Vibrant from 'node-vibrant';

const { app, dialog } = remote;

function loadID3(track, noAssign) {
    return new Promise((resolve, reject) => {
        try {
            jsmediatags.read(track.path, {
                onSuccess({ tags }) {
                    if (!tags.picture && tags.APIC) {
                        tags.picture = tags.APIC[0].data;
                    }

                    if (tags.picture) {
                        let base64String = '';

                        for (let i = 0; i < tags.picture.data.length; i++) {
                            base64String += String.fromCharCode(tags.picture.data[i]);
                        }

                        base64String = window.btoa(base64String);

                        tags.picture.base64 = `data:${tags.picture.format};base64,${base64String}`;
                    }

                    if (tags.title) {
                        track.title = tags.title;
                    }

                    const id3 = {
                        title: tags.title,
                        album: tags.album,
                        artist: tags.artist,
                        year: tags.year,
                        comment: tags.comment ? tags.comment.text : undefined,
                        picture: tags.picture ? tags.picture.base64 : undefined,
                    };

                    if (!noAssign) track.id3 = id3;

                    resolve(id3);
                },
                onError(error) {
                    console.log(track.path, error);
                },
            });
        } catch (error) {
            if (noAssign) {
                reject(error);
            } else {
                track.invalid = true;
                track.error = error.message;
                resolve();
            }

            console.log(track.path, error);
        }
    });
}

function getDurationByMM(filePath) {
    return new Promise((resolve, reject) => {
        const readableStream = fs.createReadStream(filePath);

        mm(readableStream, {
            duration: true,
        }, (error, metadata) => {
            if (error) {
                reject(error);
            } else {
                resolve(metadata.duration);
            }

            readableStream.close();
        });
    });
}

function getDurationByAudio(filePath) {
    return new Promise((resolve, reject) => {
        const data = fs.readFileSync(filePath);
        const blob = new Blob([data]);
        let audio = new Audio();

        function cleanUp() {
            URL.revokeObjectURL(audio.src);
            audio = null;
        }

        audio.onloadedmetadata = () => {
            resolve(audio.duration);
            cleanUp();
        };

        audio.onerror = error => {
            reject(error);
            cleanUp();
        };

        audio.src = URL.createObjectURL(blob);
    });
}

function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        getDurationByMM(filePath)
            .catch(() => getDurationByAudio(filePath))
            .then(resolve, reject);
    });
}

function getDominantColor(dataURL) {
    return new Promise((resolve, reject) => {
        Vibrant.from(new Buffer(dataURL.split(',')[1], 'base64')).getPalette((err, palette) => {
            if (err) {
                reject(err);
                return;
            }

            console.groupCollapsed('Cover Colors');

            Object.keys(palette).forEach(profile => {
                const swatch = palette[profile];

                if (swatch) {
                    const color = swatch.getHex();
                    const textColor = swatch.getTitleTextColor();
                    console.log(`%c ${profile}: ${color} `, `background:${color};color:${textColor}`);
                }
            });

            console.groupEnd();

            const hasColor = ['DarkVibrant', 'DarkMuted', 'Vibrant'].some(profile => {
                const swatch = palette[profile];

                if (swatch) {
                    resolve(swatch.getHex());
                }

                return swatch;
            });

            if (!hasColor) reject();
        });
    });
}

function importPlaylist() {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            buttonLabel: '导入',
            filters: [{ name: '播放列表', extensions: ['m3u', 'pls'] }],
            properties: ['openFile', 'multiSelections'],
        }, filePaths => {
            if (!filePaths) {
                reject('empty selection');
                return;
            }

            const promises = filePaths.map(filePath => {
                const fileFormat = path.extname(filePath);
                const data = fs.readFileSync(filePath, 'utf8');
                const lines = data.split('\n');
                const playlist = {
                    title: path.parse(filePath).name,
                    date: new Date(),
                    trackList: [],
                };

                switch (fileFormat) {
                    case '.pls':
                        for (let i = 1; i < lines.length - 3; i += 3) {
                            playlist.trackList.push({
                                title: lines[i + 1].substring(lines[i + 1].indexOf('=') + 1),
                                duration: Number(lines[i + 2].split('Length=')[1]),
                                path: lines[i].split('file://')[1],
                            });
                        }
                        break;
                    default:
                        for (let i = 1; i < lines.length - 1; i += 2) {
                            const info = lines[i];

                            const track = {
                                title: info.substring(info.indexOf(',') + 1),
                                duration: parseInt(info.substring(8), 10),
                                path: lines[i + 1].replace('file://', ''),
                            };

                            playlist.trackList.push(track);
                        }
                        break;
                }

                const loadID3Promises = playlist.trackList.map(track => loadID3(track));

                return Promise.all(loadID3Promises).then(() => playlist);
            });

            resolve(Promise.all(promises));
        });
    });
}

function exportPlaylist(playlist) {
    return new Promise((resolve, reject) => {
        dialog.showSaveDialog({
            title: '导出播放列表',
            defaultPath: path.join(app.getPath('music'), `${playlist.title}.m3u`),
            filters: [
                { name: 'M3U', extensions: ['m3u'] },
                { name: 'PLS', extensions: ['pls'] },
            ],
        }, fileName => {
            if (!fileName) {
                resolve();
                return;
            }

            const fileFormat = path.extname(fileName);
            const data = [];

            switch (fileFormat) {
                case '.pls':
                    data.push('[playlist]');
                    playlist.trackList.forEach((track, index) => {
                        index++;
                        data.push(`File${index}=file://${track.path}`);
                        data.push(`Title${index}=${track.title}`);
                        data.push(`Length=${track.duration}`);
                    });
                    data.push(`NumberOfEntries=${playlist.trackList.length}`);
                    data.push('Version=2');
                    break;
                default:
                    data.push('#EXTM3U');
                    playlist.trackList.forEach(track => {
                        data.push(`#EXTINF:${track.duration},${track.title}`);
                        data.push(`file://${track.path}`);
                    });
                    break;
            }

            fs.writeFile(fileName, data.join('\n'), err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

export default {
    loadID3,
    getDuration,
    getDominantColor,
    importPlaylist,
    exportPlaylist,
};
