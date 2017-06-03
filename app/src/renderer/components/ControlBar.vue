<template>
    <div id="controlBar">
        <img class="cover" :src="cover" @load="handleCoverLoad" @dragstart.prevent ref="cover" />

        <section class="playPanel">
            <button type="button" class="prev" @click="$root.playPrev" title="上一首"><icon name="skip_previous" /></button>
            <button type="button" class="play" @click="$root.playPause" :title="paused?'播放':'暂停'"><icon :name="paused?'play_arrow':'pause'" /></button>
            <button type="button" class="next" @click="$root.playNext" title="下一首"><icon name="skip_next" /></button>
        </section>

        <section class="progressPanel">
            <div class="range">
                <input type="range" class="progress" min="0" :max="duration"
                    v-show="currentTrack"
                    v-model.number="progress"
                    @mousedown="$root.clearProgressTimer"
                    @mouseup="$root.setProgressTimer">
                <div class="slider">
                    <div class="slider-fill" :style="{width: progressWidth}">
                        <div class="slider-thumb"></div>
                    </div>
                </div>
            </div>
            <span class="time">{{progress | duration}} / {{duration | duration}}</span>
        </section>

        <section class="volumePanel">
            <button type="button" class="icon" @click="$store.commit('setMuted', !muted)" :title="muted?'取消静音':'静音'"><icon :name="volumeIcon" /></button>
            <div class="range" title="音量调节">
                <input type="range" class="volume" min="0" max="100" v-model.number="volume">
                <div class="slider">
                    <div class="slider-fill" :style="{width: `${volume}%`}">
                        <div class="slider-thumb"></div>
                    </div>
                </div>
            </div>
        </section>

        <section class="btnPanel">
            <button type="button" class="playMode" :data-mode="playMode" :title="playModeText" @click="switchPlayMode"><icon :name="playModeIcon" /></button>
        </section>
    </div>
</template>

<script>
import { mapState } from 'vuex';
import utils from 'renderer/utils';
import { PLAY_MODE_MAP } from 'renderer/constants';

export default {
    methods: {
        setPrimaryColor(color) {
            if (color) {
                document.documentElement.style.setProperty('--primary-color', color);
            } else {
                document.documentElement.style.removeProperty('--primary-color');
            }
        },
        handleCoverLoad() {
            const track = this.currentTrack;

            if (!track) {
                this.setPrimaryColor();
            } else if ('color' in track) {
                this.setPrimaryColor(track.color);
            } else if (track.id3.picture) {
                utils.getDominantColor(track.id3.picture)
                    .then(color => {
                        track.color = color;
                        this.setPrimaryColor(color);
                    })
                    .catch(() => {
                        track.color = null;
                        this.setPrimaryColor();
                    });
            } else {
                this.setPrimaryColor();
            }

            if (this.isMacOS) this.$root.setDockIcon();
        },
        switchPlayMode() {
            const modes = Object.keys(PLAY_MODE_MAP);
            const index = modes.indexOf(this.playMode);

            this.playMode = modes[(index + 1) % modes.length];
        },
    },
    computed: {
        progressWidth() {
            return this.progress && this.duration ? `${this.progress / this.duration * 100}%` : 0;
        },
        playModeIcon() {
            return PLAY_MODE_MAP[this.playMode].icon;
        },
        playModeText() {
            return PLAY_MODE_MAP[this.playMode].name;
        },
        volumeIcon() {
            if (this.muted || this.volume === 0) {
                return 'volume_mute';
            } else if (this.volume < 50) {
                return 'volume_down';
            }

            return 'volume_up';
        },
        cover() {
            return this.currentTrack && this.currentTrack.id3.picture ? this.currentTrack.id3.picture : 'img/default_album_cover.png';
        },
        muted: {
            get() {
                return this.$store.state.muted;
            },
            set(value) {
                this.$store.commit('setMuted', value);
            },
        },
        progress: {
            get() {
                return this.$store.state.progress;
            },
            set(value) {
                this.$store.commit('setProgress', value);
                this.$root.audio.currentTime = value;
            },
        },
        duration: {
            get() {
                return this.$store.state.duration;
            },
            set(value) {
                this.$store.commit('setDuration', value);
            },
        },
        volume: {
            get() {
                return this.$store.state.settings.volume;
            },
            set(value) {
                this.$store.commit('updateSetting', { key: 'volume', value });
            },
        },
        playMode: {
            get() {
                return this.$store.state.settings.playMode;
            },
            set(value) {
                this.$store.commit('updateSetting', { key: 'playMode', value });
            },
        },
        ...mapState(['isMacOS', 'currentTrack', 'paused']),
    },
};
</script>
