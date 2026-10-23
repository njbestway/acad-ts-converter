import 'element-plus/dist/index.css'

import ElementPlus from 'element-plus'
import { createApp } from 'vue'

// The point of this example: make acad-ts the app's default DWG parser
// BEFORE the viewer mounts. Registration is last-writer-wins on the
// AcDbDatabaseConverterManager DWG slot, so this call overrides whatever the
// host packages registered at import time.
import { registerAcadTsConverter } from '@njbestway/acad-ts-converter'
import { i18n } from '@mlightcad/cad-viewer'

import App from './App.vue'

registerAcadTsConverter()

const app = createApp(App)
app.use(ElementPlus)
app.use(i18n)
app.mount('#app')
