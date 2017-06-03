import utils from 'renderer/utils';
import store from 'renderer/store';

const platform = process.platform;

let playlists = JSON.parse(localStorage.getItem('playlists'));
console.info('Playlists', playlists);

if (Array.isArray(playlists)) {
    playlists.forEach(playlist => {
        playlist.trackList = playlist.trackList.map(track => {
            track = {
                title: undefined,
                duration: undefined,
                path: undefined,
                id3: {},
                ...track,
            };

            utils.loadID3(track, true)
                .then(id3 => store.commit('updateTrack', { track, data: { id3 } }))
                .catch(error => store.commit('updateTrack', { track, data: { invalid: true, error: error.message } }));

            return track;
        });
    });
} else {
    playlists = [{
        title: '默认列表',
        date: Date.now(),
        trackList: [],
    }];
}

let lastPlayStatus = JSON.parse(localStorage.getItem('lastPlayStatus'));
console.info('LastPlayStatus', lastPlayStatus);

lastPlayStatus = {
    playlist: 0,
    track: 0,
    ...lastPlayStatus,
};

const lastPlaylist = playlists[lastPlayStatus.playlist];
const lastTrack = lastPlaylist ? lastPlaylist.trackList[lastPlayStatus.track] : null;

const currentPlaylist = lastPlaylist || playlists[0];

export default {
    platform,
    isMacOS: platform === 'darwin',
    isWindows: platform === 'win32',
    showSettingsPanel: false,

    playlists,
    currentPlaylist,
    selectedPlaylist: currentPlaylist,
    currentTrack: null,
    lastTrack,
    contextPlaylist: null,

    paused: true,
    duration: undefined,
    progress: undefined,
    muted: false,
    mutedVolume: undefined,
};
