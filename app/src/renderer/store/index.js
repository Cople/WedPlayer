import Vue from 'vue';
import Vuex from 'vuex';

import state from './state';
import * as getters from './getters';
import * as actions from './actions';
import * as mutations from './mutations';
import modules from './modules';

Vue.use(Vuex);

export default new Vuex.Store({
    state,
    getters,
    actions,
    mutations,
    modules,
    strict: process.env.NODE_ENV !== 'production',
});
