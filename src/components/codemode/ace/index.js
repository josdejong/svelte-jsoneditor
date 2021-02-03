import ace from 'ace-builds/src-noconflict/ace'

import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/ext-searchbox'
import './theme-jsoneditor'

// embed Ace json worker
// https://github.com/ajaxorg/ace/issues/3913
import jsonWorkerDataUrl from '../../../generated/worker-json-data-url.js'

ace.config.setModuleUrl('ace/mode/json_worker', jsonWorkerDataUrl)

export default ace
