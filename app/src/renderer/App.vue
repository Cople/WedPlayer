<template>
    <div id="app"
        :class="{tabFocused, isMacOS, isWindows}"
        @keydown.tab="tabFocused=true"
        @click="tabFocused=false">

        <main id="main">
            <div class="titlebar" v-if="isMacOS"></div>

            <div class="grid-item grid-item-sidebar">
                 <sidebar />
            </div>

            <div class="grid-item grid-item-playlist">
                <playlist v-if="selectedPlaylist" />
            </div>

            <control-bar ref="controlBar" />
        </main>

        <settings-panel v-if="showSettingsPanel" />

    </div>
</template>

<style lang="scss">
@import 'scss/App.scss';
</style>

<script>
import fs from 'fs';
import { remote } from 'electron';
import { mapState, mapMutations } from 'vuex';

import store from 'renderer/store';
import { PLAY_MODE_MAP } from 'renderer/constants';

import Sidebar from 'components/Sidebar';
import Playlist from 'components/Playlist';
import ControlBar from 'components/ControlBar';
import SettingsPanel from 'components/SettingsPanel';

const { Menu, dialog, app, shell, globalShortcut, nativeImage } = remote;
const win = remote.getCurrentWindow();

const appIcon = nativeImage.createFromPath('app/icons/icon.png');

export default {
    store,
    components: {
        Sidebar,
        Playlist,
        ControlBar,
        SettingsPanel,
    },
    data() {
        return {
            tabFocused: false,
        };
    },
    created() {
        this.registerGlobalShortcuts();
        this.setApplicationMenu();
        this.createAudio();
    },
    beforeMount() {
        store.watch(state => state.settings.iconProgress, this.setIconProgress);
        store.watch(state => state.settings.artworkDock, this.setDockIcon);

        store.watch(state => state.settings.volume, volume => {
            this.audio.volume = volume / 100;

            if (volume > 0 && this.muted) {
                store.commit('setMuted', false);
            }
        });
        store.watch(state => state.settings.playMode, mode => {
            this.audio.loop = mode === 'single';
            this.setControlsMenu(`playMode.${mode}`, 'checked', true);
        });

        store.watch(state => state.progress, this.setIconProgress);

        store.watch(state => state.muted, muted => {
            this.audio.muted = muted;

            if (muted) {
                store.commit('setMutedVolume', this.settings.volume);
                this.updateSetting('volume', 0);
            } else {
                this.updateSetting('volume', this.mutedVolume);
            }

            this.setControlsMenu('muted', 'checked', muted);
        });

        store.watch(state => state.paused, paused => {
            this.setControlsMenu('play', 'visible', paused);
            this.setControlsMenu('pause', 'visible', !paused);
        });

        store.watch(state => state.playlists, playlists => {
            if (
                playlists.indexOf(this.selectedPlaylist) === -1 ||
                (!this.selectedPlaylist && playlists.length)
            ) {
                store.commit('selectPlaylist', playlists[0]);
            }

            store.dispatch('savePlaylists');
        }, { deep: true });

        store.watch(state => state.currentTrack, (track, lastTrack) => {
            this.pause();

            if (!track) {
                store.commit('setProgress', null);
                store.commit('setDuration', null);
                return;
            }

            console.info('currentTrack', track);

            store.commit('setLastTrack', lastTrack);

            try {
                URL.revokeObjectURL(this.audio.src);

                const data = fs.readFileSync(track.path);
                const blob = new Blob([data]);
                this.audio.src = URL.createObjectURL(blob);

                store.commit('setProgress', 0);
                store.commit('setDuration', track.duration);
            } catch (error) {
                store.commit('updateCurrentTrack', {
                    invalid: true,
                    error: error.message,
                });
                dialog.showErrorBox('文件不存在', track.error);
            }
        });

        if (this.lastTrack) store.commit('setCurrentTrack', this.lastTrack);
    },
    mounted() {
        document.addEventListener('dragover', event => event.preventDefault());
        document.addEventListener('drop', event => event.preventDefault());
        window.addEventListener('beforeunload', () => store.dispatch('savePlayStatus'));
    },
    methods: {
        ifWinFocusedThenRunMethod(method) {
            if (win.isFocused()) this[method]();
        },
        registerGlobalShortcuts() {
            globalShortcut.register('MediaPlayPause', () => this.ifWinFocusedThenRunMethod('playPause'));
            globalShortcut.register('MediaStop', () => this.ifWinFocusedThenRunMethod('pause'));
            globalShortcut.register('MediaPreviousTrack', () => this.ifWinFocusedThenRunMethod('playPrev'));
            globalShortcut.register('MediaNextTrack', () => this.ifWinFocusedThenRunMethod('playNext'));
        },
        setApplicationMenu() {
            let dockMenu;

            const playModeSubmenu = Object.keys(PLAY_MODE_MAP).map(mode => ({
                type: 'radio',
                checked: this.settings.playMode === mode,
                label: PLAY_MODE_MAP[mode].name,
                id: mode,
                click: () => this.updateSetting('playMode', mode),
            }));

            const template = [
                {
                    role: 'editMenu',
                    label: '编辑',
                },
                {
                    label: '控制',
                    id: 'controls',
                    submenu: [
                        { label: '播放/暂停', id: 'playPause', accelerator: 'Space', click: () => this.playPause() },
                        { label: '上一首', accelerator: 'Super+Left', click: () => this.playPrev() },
                        { label: '下一首', accelerator: 'Super+Right', click: () => this.playNext() },
                        { type: 'separator' },
                        { label: '升高音量', accelerator: 'Super+Up', click: () => this.volumeUp() },
                        { label: '降低音量', accelerator: 'Super+Down', click: () => this.volumeDown() },
                        { label: '静音', type: 'checkbox', checked: this.muted, id: 'muted', accelerator: 'Option+Super+Down', click: () => this.volumeMute() },
                        { type: 'separator' },
                        { label: '播放模式', id: 'playMode', submenu: playModeSubmenu },
                    ],
                },
                {
                    role: 'help',
                    label: '帮助',
                    submenu: [
                        { label: 'GitHub', click() { shell.openExternal('https://github.com/Cople/WedPlayer'); } },
                    ],
                },
            ];

            if (this.isMacOS) {
                template.unshift({
                    label: app.getName(),
                    submenu: [
                        { role: 'about', label: '关于' },
                        { type: 'separator' },
                        { label: '偏好设置…', click: () => this.toggleSettingsPanel(true) },
                        { type: 'separator' },
                        { role: 'hide', label: `隐藏 ${app.getName()}` },
                        { role: 'hideothers', label: '隐藏其他' },
                        { role: 'unhide', label: '全部显示' },
                        { type: 'separator' },
                        { role: 'quit', label: '退出' },
                    ],
                });

                template.push({
                    role: 'windowMenu',
                    label: '窗口',
                    submenu: [
                        { role: 'close', label: '关闭窗口' },
                        { role: 'minimize', label: '最小化' },
                        { role: 'zoom', label: '缩放' },
                        { type: 'separator' },
                        { role: 'front', label: '前置全部窗口' },
                    ],
                });

                dockMenu = Menu.buildFromTemplate([
                    { label: '播放', id: 'play', click: () => this.play() },
                    { label: '暂停', id: 'pause', visible: false, click: () => this.pause() },
                    { label: '上一首', click: () => this.playPrev() },
                    { label: '下一首', click: () => this.playNext() },
                    { type: 'separator' },
                    { label: '升高音量', click: () => this.volumeUp() },
                    { label: '降低音量', click: () => this.volumeDown() },
                    { label: '静音', type: 'checkbox', checked: this.muted, id: 'muted', click: () => this.volumeMute() },
                    { type: 'separator' },
                    { label: '播放模式', id: 'playMode', submenu: playModeSubmenu },
                ]);
                app.dock.setMenu(dockMenu);
            } else {
                template.unshift({
                    label: app.getName(),
                    submenu: [
                        { label: '设置…', click: () => this.toggleSettingsPanel(true) },
                    ],
                });
            }

            const appMenu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(appMenu);

            const appControlsMenu = appMenu.items.filter(menu => menu.id === 'controls')[0];

            this.controlsMenus = [appControlsMenu.submenu.items];

            if (dockMenu) {
                this.controlsMenus.push(dockMenu.items);
            }
        },
        createAudio() {
            const audio = new Audio();

            const eventTypes = 'loadstart|loadedmetadata|loadeddata|durationchange|seeked|seeking|progress|canplay|canplaythrough|play|playing|pause|ended|suspend|emptied|stalled|abort'.split('|');

            eventTypes.forEach(eventType => {
                audio.addEventListener(eventType, event => console.log(event.type));
            });

            audio.addEventListener('playing', () => {
                this.setProgressTimer();

                if (this.settings.notification && audio.currentTime) {
                    this.showNotification();
                }
            });

            audio.addEventListener('error', error => {
                store.commit('updateCurrentTrack', {
                    invalid: true,
                    error: error.message,
                });

                this.pause();
            });

            audio.addEventListener('pause', () => this.clearProgressTimer());

            audio.addEventListener('ended', () => {
                this.clearProgressTimer();
                store.commit('setProgress', this.duration);

                if (this.settings.iconProgress) {
                    this.$nextTick(() => win.setProgressBar(-1));
                }

                switch (this.settings.playMode) {
                    case 'none':
                        this.pause();
                        break;
                    case 'list':
                        this.pause();
                        this.playNext();
                        break;
                    case 'random':
                        this.pause();
                        this.playRandom();
                        break;
                    default:
                }
            });

            audio.loop = this.settings.playMode === 'single';

            audio.volume = this.settings.volume / 100;

            this.audio = audio;
        },
        setProgressTimer() {
            this.clearProgressTimer();

            this.progressTimer = setInterval(() => {
                store.commit('setProgress', this.audio.currentTime);
            }, 1e3);
        },
        clearProgressTimer() {
            clearInterval(this.progressTimer);
        },
        playPlaylist() {
            store.commit('setCurrentPlaylist', this.selectedPlaylist);
            this.playTrack(0);
        },
        playTrack(track, playlist) {
            if (playlist) store.commit('setCurrentPlaylist', playlist);

            if (typeof track === 'number') track = this.currentPlaylist.trackList[track];

            if (!track) return;

            if (this.currentTrack === track) {
                this.playPause();
            } else if (track.invalid) {
                dialog.showErrorBox('无法播放', track.error || '');
            } else {
                store.commit('setCurrentTrack', track);
                this.play();
            }
        },
        playPrev() {
            if (this.settings.playMode === 'random') {
                this.playRandom();
                return;
            }

            const trackList = this.currentPlaylist.trackList;
            const index = trackList.indexOf(this.currentTrack);
            let newIndex = index;

            do {
                newIndex--;
            } while (trackList[newIndex] && trackList[newIndex].invalid);

            if (newIndex === -1) {
                newIndex = trackList.length;

                do {
                    newIndex--;
                } while (trackList[newIndex] && trackList[newIndex].invalid);
            }

            this.playTrack(newIndex);
        },
        playNext() {
            if (this.settings.playMode === 'random') {
                this.playRandom();
                return;
            }

            const trackList = this.currentPlaylist.trackList;
            const index = trackList.indexOf(this.currentTrack);
            let newIndex = index;

            do {
                newIndex++;
            } while (trackList[newIndex] && trackList[newIndex].invalid);

            if (newIndex === trackList.length) {
                newIndex = -1;

                do {
                    newIndex++;
                } while (trackList[newIndex] && trackList[newIndex].invalid);
            }

            this.playTrack(newIndex);
        },
        playRandom() {
            const validTrackList = this.currentPlaylist.trackList.filter(track => !track.invalid);
            const index = validTrackList.indexOf(this.currentTrack);
            const total = validTrackList.length;

            let newIndex;

            if (total === 0) {
                return;
            } else if (total === 1) {
                newIndex = 0;
            } else {
                do {
                    newIndex = Math.floor(Math.random() * total);
                } while (index === newIndex);
            }

            this.playTrack(validTrackList[newIndex]);
        },
        play() {
            this.$nextTick(() => {
                if (!this.currentTrack) return;

                if (this.currentTrack.invalid) {
                    if (!this.lastTrack.invalid) store.commit('setCurrentTrack', this.lastTrack);
                    return;
                }

                store.commit('setPaused', false);
                this.audio.play().catch(error => {
                    if (error.name === 'NotSupportedError') {
                        store.commit('updateCurrentTrack', {
                            invalid: true,
                            error: error.message,
                        });
                    }
                });
            });
        },
        pause() {
            store.commit('setPaused', true);
            this.audio.pause();
        },
        playPause() {
            if (!this.currentTrack) {
                this.playPlaylist();
                return;
            }

            if (this.paused) {
                this.play();
            } else {
                this.pause();
            }
        },
        volumeUp() {
            this.updateSetting('volume', Math.min(100, this.volume + 10));
        },
        volumeDown() {
            this.updateSetting('volume', Math.max(0, this.volume - 10));
        },
        volumeMute() {
            store.commit('setMuted', !this.muted);
        },
        showNotification() {
            const body = [this.currentTrack.id3.artist, this.currentTrack.id3.album].filter(f => f).join(' - ');
            const icon = this.currentTrack.id3.picture;

            const notification = new Notification(this.currentTrack.title, { body, icon, silent: true });

            notification.onerror = (err) => console.log(err);
        },
        setIconProgress() {
            if (this.settings.iconProgress) {
                win.setProgressBar(this.progress / this.duration);
            } else {
                win.setProgressBar(-1);
            }
        },
        setDockIcon() {
            if (this.settings.artworkDock && this.currentTrack && this.currentTrack.id3.picture) {
                const coverEl = this.$refs.controlBar.$refs.cover;
                const aspectRatio = coverEl.naturalWidth / coverEl.naturalHeight;
                let dataUrl;

                if (aspectRatio === 1) {
                    dataUrl = this.currentTrack.id3.picture;
                } else {
                    let canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = canvas.height = Math.max(coverEl.naturalWidth, coverEl.naturalHeight);

                    if (aspectRatio > 1) {
                        ctx.drawImage(coverEl, 0, (coverEl.naturalWidth - coverEl.naturalHeight) / 2);
                    } else {
                        ctx.drawImage(coverEl, (coverEl.naturalHeight - coverEl.naturalWidth) / 2, 0);
                    }

                    dataUrl = canvas.toDataURL('image/png');
                    canvas = null;
                }

                app.dock.setIcon(nativeImage.createFromDataURL(dataUrl));
            } else {
                app.dock.setIcon(appIcon);
            }
        },
        setControlsMenu(path, key, value) {
            this.controlsMenus.forEach(controlsMenu => {
                let menu = controlsMenu;

                path.split('.').forEach((nodeName, index) => {
                    if (index > 0) menu = menu.submenu.items;
                    menu = menu.filter(menu => menu.id === nodeName)[0];
                });

                if (menu) menu[key] = value;
            });
        },
        updateSetting(key, value) {
            store.commit('updateSetting', { key, value });
        },
        ...mapMutations(['toggleSettingsPanel']),
    },
    computed: {
        ...mapState([
            'showSettingsPanel',
            'isMacOS',
            'isWindows',
            'settings',
            'playlists',
            'currentPlaylist',
            'selectedPlaylist',
            'currentTrack',
            'lastTrack',
            'contextPlaylist',
            'paused',
            'duration',
            'progress',
            'muted',
            'mutedVolume',
        ]),
    },
};
</script>
