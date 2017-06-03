import Vue from 'vue';
import Electron from 'vue-electron';
import * as filters from './filters';
import Icon from './components/Icon.vue';

Object.keys(filters).forEach(key => Vue.filter(key, filters[key]));

Vue.component('icon', Icon);

Vue.use(Electron);

import App from './App';

window.app = new Vue({
    ...App,
}).$mount('#app');
