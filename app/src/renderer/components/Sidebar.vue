<template>
    <nav id="sidebar">
        <ul id="playlists">
            <li class="item"
                v-for="(playlist, index) in playlists"
                :class="{selected: playlist===selectedPlaylist, context: playlist===contextPlaylist}"
                :tabindex="index + 1"
                @click="$store.commit('selectPlaylist', playlist)"
                @contextmenu="handlePlaylistContextMenu(playlist)">
                <strong class="title">{{playlist.title}}</strong>
                <icon name="play_arrow" v-if="playlist===currentPlaylist" />
            </li>
            <li class="item add" v-if="enterNewPlaylistTitle">
                <input type="text" placeholder="播放列表名称"
                    v-model.trim="newPlaylistTitle"
                    ref="newTitle"
                    @keyup.enter="saveNewPlaylist"
                    @blur="saveNewPlaylist" />
            </li>
        </ul>

        <div class="addPlaylistBox">
            <icon name="playlist_add" class="toggle" />

            <div class="menu">
                <span class="create" @click="createPlaylist">新建</span>
                <span class="import" @click="importPlaylist">导入</span>
            </div>
        </div>
    </nav>
</template>

<script>
import utils from 'renderer/utils';
import { mapState } from 'vuex';

import { remote } from 'electron';
const { Menu, dialog } = remote;

export default {
    data() {
        return {
            enterNewPlaylistTitle: false,
            newPlaylistTitle: '',
        };
    },
    created() {
        this.createPlaylistContextMenu();
    },
    methods: {
        createPlaylistContextMenu() {
            const template = [
                { label: '播放', click: () => this.playPlaylist() },
                { type: 'separator' },
                { label: '导出播放列表…', click: () => this.exportPlaylist(this.contextPlaylist) },
                { type: 'separator' },
                { label: '删除播放列表', click: () => this.deletePlaylist(this.contextPlaylist) },
            ];

            this.playlistContextMenu = Menu.buildFromTemplate(template);
        },
        createPlaylist() {
            this.enterNewPlaylistTitle = true;

            this.$nextTick(() => this.$refs.newTitle.focus());
        },
        saveNewPlaylist() {
            const title = this.newPlaylistTitle;

            this.enterNewPlaylistTitle = false;
            this.newPlaylistTitle = '';

            if (!title) return;

            const playlist = {
                title,
                date: new Date(),
                trackList: [],
            };

            this.$store.commit('addPlaylist', playlist);
            this.$store.commit('selectPlaylist', playlist);
        },
        deletePlaylist(playlist) {
            if (!confirm(`确认删除播放列表「${playlist.title}」？`)) return;

            if (this.currentPlaylist === playlist) {
                this.$store.commit('setCurrentPlaylist', null);
            }

            if (this.selectedPlaylist === playlist) {
                this.$store.commit('selectPlaylist', null);
            }

            this.$store.commit('deletePlaylist', playlist);
        },
        importPlaylist() {
            utils.importPlaylist().then(playlists => {
                playlists.forEach(playlist => this.$store.commit('addPlaylist', playlist));
                this.$store.commit('selectPlaylist', playlists[0]);
            });
        },
        exportPlaylist(playlist) {
            utils.exportPlaylist(playlist).catch(err => dialog.showErrorBox('无法导出播放列表', err.message));
        },
        handlePlaylistContextMenu(playlist) {
            this.$store.commit('setContextPlaylist', playlist);

            this.playlistContextMenu.popup(remote.getCurrentWindow(), { async: true });
        },
    },
    computed: {
        ...mapState([
            'playlists',
            'currentPlaylist',
            'selectedPlaylist',
            'contextPlaylist',
        ]),
    },
};
</script>
