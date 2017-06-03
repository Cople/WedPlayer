export const toggleSettingsPanel = (state, display) => {
    state.showSettingsPanel = display;
};

export const addPlaylist = (state, playlist) => {
    state.playlists.push(playlist);
};

export const selectPlaylist = (state, playlist) => {
    state.selectedPlaylist = playlist;
};

export const setCurrentPlaylist = (state, playlist) => {
    state.currentPlaylist = playlist;
    if (!playlist) state.currentTrack = null;
};

export const updateSelectedPlaylist = (state, { key, value }) => {
    state.selectedPlaylist[key] = value;
};

export const deletePlaylist = (state, playlist) => {
    const index = state.playlists.indexOf(playlist);
    state.playlists.splice(index, 1);
};

export const setContextPlaylist = (state, playlist) => {
    state.contextPlaylist = playlist;
};

export const setCurrentTrack = (state, track) => {
    state.currentTrack = track;
};

export const updateTrack = (state, { track, data }) => {
    Object.assign(track, data);
};

export const updateCurrentTrack = (state, payload) => {
    Object.assign(state.currentTrack, payload);
};

export const addTracks = (state, { tracks, index }) => {
    if (typeof index === 'number') {
        state.selectedPlaylist.trackList.splice(index, 0, ...tracks);
    } else {
        state.selectedPlaylist.trackList.push(...tracks);
    }
};

export const moveTrack = (state, { oldIndex, newIndex }) => {
    const track = state.selectedPlaylist.trackList.splice(oldIndex, 1)[0];
    state.selectedPlaylist.trackList.splice(newIndex, 0, track);
};

export const deleteTracks = (state, tracks) => {
    while (tracks.length) {
        const index = state.selectedPlaylist.trackList.indexOf(tracks.shift());
        state.selectedPlaylist.trackList.splice(index, 1);
    }
};

export const setLastTrack = (state, track) => {
    state.lastTrack = track;
};

export const setPaused = (state, paused) => {
    state.paused = paused;
};

export const setProgress = (state, progress) => {
    state.progress = progress;
};

export const setDuration = (state, duration) => {
    state.duration = duration;
};

export const setMuted = (state, muted) => {
    state.muted = muted;
};

export const setMutedVolume = (state, volume) => {
    state.mutedVolume = volume;
};
