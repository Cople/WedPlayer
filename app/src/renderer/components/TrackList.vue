<template>
    <ul class="trackList" tabindex="1"
        @keydown.65="handleKeyDown"
        @keydown.delete="deleteTracks">

        <li class="track" draggable
            v-for="(track, index) in selectedPlaylist.trackList"
            :data-index="index"
            :class="{
                selected: selectedTracks.includes(track),
                current: track===currentTrack,
                playing: !paused&&track===currentTrack,
                invalid: track.invalid
            }"
            @click="handleTrackClick($event, track, index)"
            @contextmenu="handleTrackContextMenu(track)"
            @dblclick="$root.playTrack(index, selectedPlaylist)"
            @dragstart="handleTrackItemDragStart($event, track)">

            <span class="no" :data-no="index + 1">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </span>

            <div class="bd">
                <strong class="title">{{track.title}}</strong>
                <span class="description" v-if="track.id3">{{track.id3 | description(settings.descriptionFormat)}}</span>
            </div>

            <time class="duration">{{track.duration | duration}}</time>

        </li>

    </ul>
</template>

<script>
import { mapState } from 'vuex';
import { remote } from 'electron';
const { Menu, shell } = remote;

export default {
    data() {
        return {
            selectedTracks: [],
        };
    },
    created() {
        this.createTrackContextMenu();
    },
    beforeMount() {
        this.$store.watch(state => state.selectedPlaylist, () => {
            this.selectedTracks = [];
        });
    },
    methods: {
        createTrackContextMenu() {
            const template = [
                { label: '播放', click: () => this.$root.playTrack(this.contextTrack, this.selectedPlaylist) },
                { type: 'separator' },
                { label: '打开文件位置', click: () => shell.showItemInFolder(this.contextTrack.path) },
                { label: '从列表中删除', click: () => this.deleteTracks() },
            ];

            this.trackContextMenu = Menu.buildFromTemplate(template);
        },
        deleteTracks() {
            if (!this.selectedTracks.length) return;
            if (!confirm(`确认删除选中的 ${this.selectedTracks.length} 首音乐？`)) return;

            let forcePause = false;

            if (this.selectedTracks.includes(this.currentTrack)) {
                this.$store.commit('setCurrentTrack', null);
                forcePause = true;
            }

            this.$store.commit('deleteTracks', this.selectedTracks);

            if (forcePause && this.playMode !== 'none' && this.playMode !== 'single') {
                this.playNext();
            }
        },
        handleTrackItemDragStart(event, track) {
            this.selectedTracks = [track];
            this.dragTrack = event.target;
            this.dragTrack.classList.add('ghost');

            this.handleTrackItemDragOverBind = this.handleTrackItemDragOver.bind(this);
            this.handleTrackItemDragEndBind = this.handleTrackItemDragEnd.bind(this);
            this.$el.addEventListener('dragover', this.handleTrackItemDragOverBind, false);
            this.$el.addEventListener('dragend', this.handleTrackItemDragEndBind, false);
        },
        handleTrackItemDragOver(event) {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';

            const target = event.target;
            if (target !== this.dragTrack && target.tagName === 'LI') {
                this.dragTrack.parentNode.insertBefore(this.dragTrack, target.previousElementSibling ? target.nextElementSibling : target);
            }
        },
        handleTrackItemDragEnd(event) {
            event.stopPropagation();
            event.preventDefault();

            const oldIndex = this.selectedPlaylist.trackList.indexOf(this.selectedTracks[0]);
            let newIndex;

            const children = Array.from(this.dragTrack.parentNode.children);
            for (const [index, el] of children.entries()) {
                if (el === this.dragTrack) {
                    newIndex = index;
                    break;
                }
            }

            this.dragTrack.parentNode.insertBefore(this.dragTrack, children[newIndex > oldIndex ? oldIndex : oldIndex + 1]);

            this.$store.commit('moveTrack', { oldIndex, newIndex });

            this.dragTrack.classList.remove('ghost');
            this.$el.removeEventListener('dragover', this.handleTrackItemDragOverBind, false);
            this.$el.removeEventListener('dragend', this.handleTrackItemDragEndBind, false);
            this.dragTrack = null;
        },
        handleKeyDown(event) {
            if (this.isMacOS ? event.metaKey : event.ctrlKey) {
                this.selectedTracks = this.selectedPlaylist.trackList;
            }
        },
        handleTrackClick(event, track, index) {
            if (this.selectedTracks.length && !this.selectedPlaylist.trackList.includes(this.selectedTracks[0])) {
                this.selectedTracks = [];
            }

            if (event.shiftKey) {
                if (this.selectedTracks.length) {
                    const trackList = this.selectedPlaylist.trackList;
                    const start = trackList.indexOf(this.selectedTracks[0]);
                    const end = trackList.indexOf(this.selectedTracks[this.selectedTracks.length - 1]);

                    if (this.selectedTracks.includes(track)) {
                        this.selectedTracks = trackList.slice(start, Math.min(end, index) + 1);
                    } else {
                        this.selectedTracks = trackList.slice(Math.min(start, index), Math.max(end, index) + 1);
                    }
                } else {
                    this.selectedTracks.push(track);
                }
            } else if (this.isMacOS ? event.metaKey : event.ctrlKey) {
                if (this.selectedTracks.includes(track)) {
                    index = this.selectedTracks.indexOf(track);
                    this.selectedTracks.splice(index, 1);
                } else {
                    this.selectedTracks.push(track);
                }
            } else {
                this.selectedTracks = [track];
            }
        },
        handleTrackContextMenu(track) {
            this.contextTrack = track;

            if (!this.selectedTracks.includes(track)) {
                this.selectedTracks = [track];
            }

            this.trackContextMenu.popup(remote.getCurrentWindow(), { async: true });
        },
    },
    filters: {
        description(id3, format) {
            return format.replace(/%([a-z]+)%/ig, (match, key) => id3[key] || '');
        },
    },
    computed: {
        ...mapState([
            'paused',
            'selectedPlaylist',
            'currentTrack',
            'settings',
        ]),
    },
};
</script>
