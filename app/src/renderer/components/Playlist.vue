<template>
    <section id="playlist" @scroll.passive="handleScroll">
        <header class="info" :style="{height: infoHeight+'px', top: infoTop+'px'}">
            <editable-title :value="selectedPlaylist.title" @change="handleTitleChange" />

            <div :style="{opacity: infoOpacity}">
                <time class="dateCreated">创建于 {{selectedPlaylist.date | dateCreated}}</time>

                <editable-summary :value="selectedPlaylist.summary" @change="handleSummaryChange" />
            </div>

            <button type="button" class="play" @click="$root.playPlaylist"><icon name="play_circle_outline" /> 播放</button>
        </header>

        <div class="trackListWrap"
            :class="{dragging}"
            @dragenter.prevent="handleFileDragEnter"
            @dragover.prevent="handleFileDragOver"
            @dragleave.prevent="handleFileDragLeave"
            @drop.prevent="handleFileDrop">

            <track-list ref="trackList" v-if="selectedPlaylist.trackList.length" />

            <div class="emptyTip" v-else>
                <icon name="queue_music" />
                <strong>空空如也</strong>
                <p @click="showAddTracksDialog">点击添加音乐或拖动文件到此处</p>
            </div>
        </div>
    </section>
</template>

<script>
import fs from 'fs';
import path from 'path';
import { mapState } from 'vuex';
import utils from 'renderer/utils';
import { remote } from 'electron';
const { dialog } = remote;
import { SUPPORT_AUDIO_FORMATS } from 'renderer/constants';

import EditableTitle from 'components/EditableTitle';
import EditableSummary from 'components/EditableSummary';
import TrackList from 'components/TrackList';

export default {
    components: {
        EditableTitle,
        EditableSummary,
        TrackList,
    },
    props: {
        infoMaxHeight: {
            type: Number,
            default: 200,
        },
    },
    data() {
        return {
            infoTop: 0,
            infoHeight: this.infoMaxHeight,
            infoOpacity: 1,

            dragging: false,
        };
    },
    methods: {
        handleScroll(event) {
            const scrollTop = event.target.scrollTop;
            const minHeight = 120;

            this.infoTop = scrollTop;
            this.infoHeight = Math.max(minHeight, Math.min(this.infoMaxHeight, this.infoMaxHeight - scrollTop));
            this.infoOpacity = (this.infoHeight - minHeight) / (this.infoMaxHeight - minHeight);
        },
        handleTitleChange(value) {
            this.$store.commit('updateSelectedPlaylist', { key: 'title', value });
        },
        handleSummaryChange(value) {
            this.$store.commit('updateSelectedPlaylist', { key: 'summary', value });
        },
        addTracks(filePaths, index) {
            const tracks = [];

            const addTrack = filePath => {
                const track = {
                    title: path.parse(filePath).name,
                    path: filePath,
                    duration: undefined,
                };

                return utils.getDuration(filePath).then(duration => {
                    track.duration = duration;
                    return utils.loadID3(track).then(() => tracks.push(track));
                }, error => {
                    track.invalid = true;
                    track.error = error.message;
                    tracks.push(track);
                });
            };

            filePaths
                .reduce((p, filePath) => p.then(() => addTrack(filePath)), Promise.resolve())
                .then(() => {
                    if (typeof index === 'number') {
                        this.$store.commit('addTracks', { tracks, index });
                    } else {
                        this.$store.commit('addTracks', { tracks });
                    }
                });
        },
        showAddTracksDialog() {
            dialog.showOpenDialog({
                buttonLabel: '添加',
                filters: [{ name: '音乐文件', extensions: SUPPORT_AUDIO_FORMATS.map(format => format.substring(1)) }],
                properties: ['openFile', 'multiSelections', ...[this.isMacOS ? 'openDirectory' : null]],
            }, filePaths => {
                if (!filePaths) return;

                if (fs.lstatSync(filePaths[0]).isDirectory()) {
                    filePaths.forEach(dirPath => {
                        filePaths = fs.readdirSync(dirPath).filter(file => SUPPORT_AUDIO_FORMATS.includes(path.extname(file))).map(file => `${dirPath}/${file}`);
                        this.addTracks(filePaths);
                    });
                } else {
                    this.addTracks(filePaths);
                }
            });
        },
        handleFileDragEnter() {
            if (!this.dropPlaceholder) {
                const dropPlaceholder = document.createElement('li');
                dropPlaceholder.className = 'drop-placeholder';
                this.dropPlaceholder = dropPlaceholder;
            }

            if (this.$refs.trackList) {
                clearTimeout(this.dragCancelTimer);
            }

            this.dragging = true;
        },
        handleFileDragOver(event) {
            event.dataTransfer.dropEffect = 'copy';

            if (this.$refs.trackList) {
                const target = event.target;

                if (target !== this.dropPlaceholder && target.nodeName === 'LI') {
                    if (target.dataset.index === '0' && event.pageY < target.offsetTop + target.offsetHeight / 2) {
                        this.$refs.trackList.$el.insertBefore(this.dropPlaceholder, target);
                    } else {
                        this.$refs.trackList.$el.insertBefore(this.dropPlaceholder, target.nextElementSibling);
                    }
                }

                clearTimeout(this.dragCancelTimer);
            }

            this.dragging = true;
        },
        handleFileDragLeave() {
            this.dragging = false;

            if (this.$refs.trackList) {
                clearTimeout(this.dragCancelTimer);

                this.dragCancelTimer = setTimeout(() => {
                    if (this.dropPlaceholder.parentNode) this.$refs.trackList.$el.removeChild(this.dropPlaceholder);
                }, 100);
            }
        },
        handleFileDrop(event) {
            this.dragging = false;

            const files = Array.from(event.dataTransfer.files).filter(file => this.$root.audio.canPlayType(file.type));

            if (this.$refs.trackList) {
                let targetIndex;
                const children = Array.from(this.$refs.trackList.$el.children);
                for (const [index, el] of children.entries()) {
                    if (el === this.dropPlaceholder) {
                        targetIndex = index;
                        break;
                    }
                }

                if (this.dropPlaceholder.parentNode) this.$refs.trackList.$el.removeChild(this.dropPlaceholder);

                this.addTracks(files.map(file => file.path), targetIndex);
            } else {
                this.addTracks(files.map(file => file.path));
            }
        },
    },
    filters: {
        dateCreated(date) {
            if (!(date instanceof Date)) {
                date = new Date(date);
            }

            return date.toLocaleDateString();
        },
    },
    computed: {
        ...mapState([
            'isMacOS',
            'selectedPlaylist',
        ]),
    },
};
</script>
