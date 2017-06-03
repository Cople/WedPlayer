<template>
    <div id="settings-panel">
        <div id="settings-dialog">
            <header class="hd">
                <h3 class="title">设置</h3>
                <icon name="close" class="close" @click.native="toggleSettingsPanel(false)" />
            </header>
            <div class="bd">
                <p>
                    <input type="checkbox" id="notification" v-model="notification" @change="updateSetting">
                    <label for="notification" class="check"><icon name="check_box_outline_blank" /></label>
                    <label for="notification" class="checked"><icon name="check_box" /></label>
                    <label for="notification">切换音乐时显示通知</label>
                </p>
                <p>
                    <input type="checkbox" id="iconProgress" v-model="iconProgress" @change="updateSetting">
                    <label for="iconProgress" class="check"><icon name="check_box_outline_blank" /></label>
                    <label for="iconProgress" class="checked"><icon name="check_box" /></label>
                    <label for="iconProgress">在图标上显示播放进度</label>
                </p>
                <p v-if="$store.state.isMacOS">
                    <input type="checkbox" id="artworkDock" v-model="artworkDock" @change="updateSetting">
                    <label for="artworkDock" class="check"><icon name="check_box_outline_blank" /></label>
                    <label for="artworkDock" class="checked"><icon name="check_box" /></label>
                    <label for="artworkDock">在 Dock 上显示音乐封面</label>
                </p>
                <p>
                    <label for="descriptionFormat">音乐信息格式</label>
                    <input type="text" id="descriptionFormat" v-model.lazy.trim="descriptionFormat" @change="updateSetting">
                </p>
                <dl class="descriptionFormatList">
                    <dt><code>%album%</code></dt><dd>专辑</dd>
                    <dt><code>%artist%</code></dt><dd>音乐人</dd>
                    <dt><code>%comment%</code></dt><dd>歌曲描述</dd>
                </dl>
            </div>
        </div>
    </div>
</template>

<script>
import { mapMutations } from 'vuex';

export default {
    data() {
        return { ...this.$store.state.settings };
    },
    methods: {
        updateSetting(event) {
            const input = event.target;

            this.$store.commit('updateSetting', {
                key: input.id,
                value: input.type === 'checkbox' ? input.checked : input.value,
            });
        },
        ...mapMutations(['toggleSettingsPanel']),
    },
};
</script>
