import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import './assets/main.css'

import piniaPersist from 'pinia-plugin-persistedstate'

const app = createApp(App);
app.use(createPinia().use(piniaPersist));
app.mount("#app");
