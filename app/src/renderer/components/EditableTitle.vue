<template>
    <input class="title"
        :placeholder="placeholder"
        v-if="editing"
        v-model.lazy.trim="newValue"
        @blur="endEdit"
        @keyup.enter="$refs.input.blur()"
        ref="input" />

    <h3 class="title" :title="title" @dblclick="startEdit" v-else>{{value}}</h3>
</template>

<script>
export default {
    props: {
        placeholder: {
            type: String,
            default: '请输入播放列表名称',
        },
        title: {
            type: String,
            default: '双击编辑播放列表名称',
        },
        value: String,
    },
    data() {
        return {
            editing: false,
            newValue: '',
        };
    },
    methods: {
        startEdit() {
            this.newValue = this.value;

            this.editing = true;

            this.$nextTick(() => this.$refs.input.focus());
        },
        endEdit() {
            this.editing = false;

            if (this.newValue && this.newValue !== this.value) {
                this.$emit('change', this.newValue);
            }
        },
    },
};
</script>
