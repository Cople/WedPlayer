<template>
    <i class="material-icons" v-text="name"></i>
</template>

<script>
export default {
    props: {
        name: String,
        required: true,
    },
};
</script>
