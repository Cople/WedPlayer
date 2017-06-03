const localConfig = JSON.parse(localStorage.getItem('config'));
console.info('Config', localConfig);

const state = {
    volume: 70,
    playMode: 'list',
    notification: false,
    iconProgress: false,
    artworkDock: false,
    descriptionFormat: '%artist% - %comment%',
    ...localConfig,
};

const mutations = {
    updateSetting(state, { key, value }) {
        state[key] = value;
        localStorage.setItem('config', JSON.stringify(state));
    },
};

export default {
    state,
    mutations,
};
