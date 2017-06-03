<template>
    <textarea class="summary"
        :placeholder="placeholder"
        v-if="editing"
        v-model.lazy.trim="newValue"
        @blur="endEdit"
        ref="input"></textarea>

    <p class="summary" :title="title" @dblclick="startEdit" v-else>{{value||'暂无介绍'}}</p>
</template>

<script>
export default {
    props: {
        placeholder: {
            type: String,
            default: '请输入介绍',
        },
        title: {
            type: String,
            default: '双击编辑介绍',
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

            if (this.newValue !== this.value) {
                this.$emit('change', this.newValue);
            }
        },
    },
};
</script>
