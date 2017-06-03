export const savePlayStatus = ({ state }) => {
    localStorage.setItem('lastPlayStatus', JSON.stringify({
        playlist: state.playlists.indexOf(state.currentPlaylist),
        track: state.currentPlaylist.trackList.indexOf(state.currentTrack),
    }));
};

export const savePlaylists = ({ state }) => {
    const playlists = JSON.parse(JSON.stringify(state.playlists));
    const saveKeys = ['title', 'path', 'duration'];

    playlists.forEach(playlist => {
        playlist.trackList.forEach(track => {
            Object.keys(track).forEach(key => {
                if (!saveKeys.includes(key)) delete track[key];
            });
        });
    });

    localStorage.setItem('playlists', JSON.stringify(playlists));
};
