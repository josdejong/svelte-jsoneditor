# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.3.25](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.24...v0.3.25) (2022-03-22)


### Features

* drag selected contents up and down ([#50](https://github.com/josdejong/svelte-jsoneditor/issues/50)) ([c3c4113](https://github.com/josdejong/svelte-jsoneditor/commit/c3c4113441c2a2df111da5e74b312a9146900927))


### Bug Fixes

* validate in code mode not always triggering ([246cf67](https://github.com/josdejong/svelte-jsoneditor/commit/246cf670259393c56934f0955df31ec957e3f863))

### [0.3.24](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.23...v0.3.24) (2022-03-16)


### Bug Fixes

* component EditableDiv did not close when losing focus to another element on the same page ([a8abe71](https://github.com/josdejong/svelte-jsoneditor/commit/a8abe710f5e2d10bf31f7272f709d53665a1eb88))
* define font for linting messages ([8a5456f](https://github.com/josdejong/svelte-jsoneditor/commit/8a5456f3de474c58e49b637617d1694b515e1055))
* editor layout does overflow when opening a large minified document in code mode ([#48](https://github.com/josdejong/svelte-jsoneditor/issues/48)) ([5574d38](https://github.com/josdejong/svelte-jsoneditor/commit/5574d38164f48610842a0707be81cf9ca12bd53b))
* implement quick keys Ctrl+F and Ctrl+H to open the find dialog whilst editing a key or value ([e608486](https://github.com/josdejong/svelte-jsoneditor/commit/e608486a53c59cb53b3cf1240884d7d2147fd345))
* minor styling fix ([1399dd8](https://github.com/josdejong/svelte-jsoneditor/commit/1399dd8272de55f22d77b1633bd124632064606f))
* styling tweaks ([1d15f2b](https://github.com/josdejong/svelte-jsoneditor/commit/1d15f2b2675922d4c566cdd6cec53caac70dcd7e))
* wrapping line in Copy dropdown menu ([61b10ac](https://github.com/josdejong/svelte-jsoneditor/commit/61b10ac1d4a50b7d9b7e68b9316adbedd47ffd02))

### [0.3.23](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.22...v0.3.23) (2022-03-08)


### Bug Fixes

* do not use dynamic imports ([b5ca813](https://github.com/josdejong/svelte-jsoneditor/commit/b5ca813ef1c5a4dbd5527c496afe824986e3a45e))

### [0.3.22](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.21...v0.3.22) (2022-03-08)


### Bug Fixes

* publish missing generated/* folder on npm too ([ec391b2](https://github.com/josdejong/svelte-jsoneditor/commit/ec391b28b7c12bed81f65ff8b35a9fabba88d349))
* publish missing generated/* folder on npm too ([a0195cd](https://github.com/josdejong/svelte-jsoneditor/commit/a0195cde8e77850a431eb0a77219d644c80af1d7))

### [0.3.21](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.20...v0.3.21) (2022-03-08)


### Features

* replace Ace with CodeMirror 6 ([#46](https://github.com/josdejong/svelte-jsoneditor/issues/46)) ([71cc856](https://github.com/josdejong/svelte-jsoneditor/commit/71cc856c81456dbb788b14d847e30a289bf2a129))

### [0.3.20](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.19...v0.3.20) (2022-03-07)


### Bug Fixes

* drop `viteOptimizeDeps` (in `src/config.js`) and remove it from the docs: not needed anymore ([1c64009](https://github.com/josdejong/svelte-jsoneditor/commit/1c64009469c7914f5daffa93c4402c4643072a03))

### [0.3.19](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.18...v0.3.19) (2022-03-07)


### Bug Fixes

* add `generated` folder to .prettierignore ([e15ee93](https://github.com/josdejong/svelte-jsoneditor/commit/e15ee931eab2a4e273a3dae188ecdf6ab284351f))
* diff-sequences export not playing nice with Vite ([f87a7b3](https://github.com/josdejong/svelte-jsoneditor/commit/f87a7b379e9204bc835de87125371f709f77dc3c))

### [0.3.18](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.17...v0.3.18) (2022-02-09)


### Bug Fixes

* race condition when toggling mode ([2a97ab5](https://github.com/josdejong/svelte-jsoneditor/commit/2a97ab55191ddb5e9a79591a74bf342a0e89e9e8))
* update all dependencies ([f083d2c](https://github.com/josdejong/svelte-jsoneditor/commit/f083d2c1c9570e91b24ee037d1d988c9e733722f))

### [0.3.17](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.16...v0.3.17) (2022-02-09)


### Bug Fixes

* improve explanatory titles on color picker and boolean toggle when readOnly ([aac632b](https://github.com/josdejong/svelte-jsoneditor/commit/aac632bcb9ceeb9a9ab4358aefdea2523c0adb4e))
* only show explanatory titles on color picker and boolean toggle when editable ([4971138](https://github.com/josdejong/svelte-jsoneditor/commit/49711385d97ba10499285a02b9c365b7719f7c55))
* rename schemaRefs to schemaDefinitions (not breaking, just a renamed function argument) ([0e7d653](https://github.com/josdejong/svelte-jsoneditor/commit/0e7d65335212188011d7ba0c3ce8438a99b22ee5))
* shortcut Shift+Enter to create a newline not working on Chrome ([48a10a6](https://github.com/josdejong/svelte-jsoneditor/commit/48a10a667ce1d19258bb09f7cb23e8931ba9f39f))
* update dependencies ([4bc6d53](https://github.com/josdejong/svelte-jsoneditor/commit/4bc6d5356c5f401bf5a0e0ff60a67a046b346e5a))

### [0.3.16](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.15...v0.3.16) (2022-01-20)


### Features

* implement support for enforcing a value to stay a string when it contains a numeric value.
  This can be toggled via the button "Enforce string" in ContextMenu, under "Edit value".


### Bug Fixes

* [#45](https://github.com/josdejong/svelte-jsoneditor/issues/45) invoke onChangeMode after re-rendering instead of before ([c8894ce](https://github.com/josdejong/svelte-jsoneditor/commit/c8894ce2b618df3cadf5cc8a6ac8a3cc44c15c9f))


### [0.3.15](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.14...v0.3.15) (2022-01-12)


### Bug Fixes

* regression in clicking the context menu button on an insert area ([f5bcc71](https://github.com/josdejong/svelte-jsoneditor/commit/f5bcc7166720bac94b7ea222f5e95e8a39368d46))

### [0.3.14](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.13...v0.3.14) (2022-01-08)


### Bug Fixes

* expand contents when pasting in an empty document ([a3c8021](https://github.com/josdejong/svelte-jsoneditor/commit/a3c80216370dfa176b0eafd6afa9e88a0f9d579f))
* shift-click not working when selecting an area in between two nodes ([c21f1f3](https://github.com/josdejong/svelte-jsoneditor/commit/c21f1f310382b39c4ca4b27725b982feeb48acbf))
* shift-click to select multiple items broken ([a28bbdf](https://github.com/josdejong/svelte-jsoneditor/commit/a28bbdf8c8a3354a9f6e32efd2cb7b44656f91dd))

### [0.3.13](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.12...v0.3.13) (2022-01-05)


### Bug Fixes

* clicking on another node whilst editing did not move the focus there ([b2fe3d7](https://github.com/josdejong/svelte-jsoneditor/commit/b2fe3d7e558358d4aa7f0400d90da366b56bbb6c))
* fix too large padding for expanded array bracket ([0963960](https://github.com/josdejong/svelte-jsoneditor/commit/09639609d9b642a9df0caa663caaad6903816cd8))
* issue in encode/decode datapath ([a56cb1b](https://github.com/josdejong/svelte-jsoneditor/commit/a56cb1ba867c336f8ee72b7c505ba669024beb28))
* make the code robust against missing refContents ([360de5e](https://github.com/josdejong/svelte-jsoneditor/commit/360de5e9e01b6008f5062fec70ffb621b66f70ed))
* scrollTo throwing exception when contents is empty ([68fcb6a](https://github.com/josdejong/svelte-jsoneditor/commit/68fcb6aaa59490130e528b25bdea014a315e7285))
* styling tweak for the readonly item count tag ([5bbb679](https://github.com/josdejong/svelte-jsoneditor/commit/5bbb679efccb235a17fafcc82919ea14cb62c66d))
* when opening edit mode, sometimes the first typed character was lost ([22b5577](https://github.com/josdejong/svelte-jsoneditor/commit/22b5577f3432501776b56abdedda5c1854f5d809))

### [0.3.12](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.11...v0.3.12) (2022-01-05)


### Bug Fixes

* revert "fix: upgrade to the latest version of sveltekit and vite, removing the need for viteOptimizeDeps"

### [0.3.11](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.10...v0.3.11) (2022-01-05)


### Bug Fixes

* property `normalization` missing the docs and in development application ([002b7e9](https://github.com/josdejong/svelte-jsoneditor/commit/002b7e995decc602962a4b74c5cd6847477df405))
* tweak font for ubuntu and mac ([b05009c](https://github.com/josdejong/svelte-jsoneditor/commit/b05009c4b41b200ec8703c85373f55f96138f96f))
* upgrade to the latest version of sveltekit and vite, removing the need for viteOptimizeDeps ([c7211a3](https://github.com/josdejong/svelte-jsoneditor/commit/c7211a30981a453ee0a86ac2594bf0cca3431436))

### [0.3.10](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.9...v0.3.10) (2021-12-22)


### Features

* implement options escapeControlCharacters and escapeUnicodeCharacters ([#42](https://github.com/josdejong/svelte-jsoneditor/issues/42)) ([cfdd8cc](https://github.com/josdejong/svelte-jsoneditor/commit/cfdd8cca0639a93ca5bb62cca84b31e7b3c9ee6f))
* show tag with array item count also when expanded ([b427fe7](https://github.com/josdejong/svelte-jsoneditor/commit/b427fe7f4618a633882b241ee771d05ce3daa092))


### Bug Fixes

* add property `type` to `<button>` where missing (see [#39](https://github.com/josdejong/svelte-jsoneditor/issues/39)) ([880795f](https://github.com/josdejong/svelte-jsoneditor/commit/880795f751ffa18f2f5fe63958a880e1d80de165))
* clicking outside the editor should stop editing a key/value (see [#40](https://github.com/josdejong/svelte-jsoneditor/issues/40)) ([b67de42](https://github.com/josdejong/svelte-jsoneditor/commit/b67de420fd0be2057c85c175f0e1bc0d8ee2b3e5))
* escape special characters in keys ([10fdedd](https://github.com/josdejong/svelte-jsoneditor/commit/10fdedd2d422020c6fb2e3f81ae96a1db5156381))
* make sure editor blur when clicking outside ([aef0d57](https://github.com/josdejong/svelte-jsoneditor/commit/aef0d57899ef0c3683b9cfda1255c926b937551a))
* partial fix for [#40](https://github.com/josdejong/svelte-jsoneditor/issues/40), clicking outside the editor should stop editing a key/value ([70eab0c](https://github.com/josdejong/svelte-jsoneditor/commit/70eab0c5f6204c844396d19f048e86a20b56ad38))

### [0.3.9](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.8...v0.3.9) (2021-12-04)


### Bug Fixes

* remember state of TransformModal and SortModal on every change instead of only after submit ([caa4364](https://github.com/josdejong/svelte-jsoneditor/commit/caa4364eba8c3db06b265e55bc0e0d6bc35c828e))

### [0.3.8](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.7...v0.3.8) (2021-12-04)


### Bug Fixes

* add current value to the enum dropdown if needed ([8f11bac](https://github.com/josdejong/svelte-jsoneditor/commit/8f11baca5b5613250b7d60ddfcaaf7f13b12fdc7))

### [0.3.7](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.6...v0.3.7) (2021-12-04)


### Features

* custom rendering with onRenderValue, performance improvements, and fixes ([635f542](https://github.com/josdejong/svelte-jsoneditor/commit/635f542d92b21350100d2333764657d60650d167))

### [0.3.6](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.5...v0.3.6) (2021-11-27)


### Bug Fixes

* merge [#32](https://github.com/josdejong/svelte-jsoneditor/issues/32) adding rollup to the devDependencies ([f292c2f](https://github.com/josdejong/svelte-jsoneditor/commit/f292c2f057a46f4c0d7b3e4c65637bc1e9463327))
* replace `debug` with a util debug function ([#34](https://github.com/josdejong/svelte-jsoneditor/issues/34)) ([ddf608a](https://github.com/josdejong/svelte-jsoneditor/commit/ddf608aa77ddf04b3e31db70f1719e90a94664fa))
* update dependencies ([f87572e](https://github.com/josdejong/svelte-jsoneditor/commit/f87572e2827ec325f3f55318cdd595f762477fbb))
* use debug instead of console.log ([b2478b8](https://github.com/josdejong/svelte-jsoneditor/commit/b2478b86b4382e75400036fab542db17cc874f3e))

### [0.3.5](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.4...v0.3.5) (2021-11-17)


### Features

* extend the `onChange` callback to pass previousJson and patchResult ([8e5aecf](https://github.com/josdejong/svelte-jsoneditor/commit/8e5aecf4b0ac29c97d545098f037d7f027182558))
* implement `javascriptQueryLanguage` ([6568afe](https://github.com/josdejong/svelte-jsoneditor/commit/6568afee6f5dd28f3167dcf46bfeb78b6376bee8))
* implement a configuration dropdown to select a query language ([871ac5c](https://github.com/josdejong/svelte-jsoneditor/commit/871ac5ce6b95033aa7caa1a4aa4d92b886b89345))
* support multiple query languages in the transform modal (WIP) ([030d3ca](https://github.com/josdejong/svelte-jsoneditor/commit/030d3ca9601f28a788998d88f7975c1180e190f2))


### Bug Fixes

* edge case in jmespath selecting whole item as projection ([ef2a4cf](https://github.com/josdejong/svelte-jsoneditor/commit/ef2a4cf0995cab3f418c7c8f1b2ed16878bb679b))
* improve the performance of replacing returns with enclosing whitespaces ([de05b10](https://github.com/josdejong/svelte-jsoneditor/commit/de05b103d511140669f12c0f180436fc86cb4ec9))
* robustness fix ([54c6586](https://github.com/josdejong/svelte-jsoneditor/commit/54c6586a0f7c286c71789b8698a2affe3c5411bb))
* show arrow down icon on the right side of the select boxes ([c0375b1](https://github.com/josdejong/svelte-jsoneditor/commit/c0375b1888ac5e7341bd559a458d7802854a5151))
* small styling fix ([ec83c32](https://github.com/josdejong/svelte-jsoneditor/commit/ec83c3263eb8bf7c55f57b90d564e56b0aa17624))
* styling fix of the scrollbar in the TransformModal ([5adc31d](https://github.com/josdejong/svelte-jsoneditor/commit/5adc31d23635e8eac94ffc8c2479adf3cab439ad))
* write unit tests and fixes for all query languages ([a6af472](https://github.com/josdejong/svelte-jsoneditor/commit/a6af4728ff6695d872489e4f305dae16ab75a908))

### [0.3.4](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.3...v0.3.4) (2021-11-03)


### Features

* implement search and replace ([#30](https://github.com/josdejong/svelte-jsoneditor/issues/30)) ([3fb89d4](https://github.com/josdejong/svelte-jsoneditor/commit/3fb89d474f600dd2962a5a48497961a40196fe88))

### [0.3.3](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.2...v0.3.3) (2021-10-13)


### Bug Fixes

* debounce changes in code mode, fixing a race condition in React (see [#23](https://github.com/josdejong/svelte-jsoneditor/issues/23)) ([bc2c559](https://github.com/josdejong/svelte-jsoneditor/commit/bc2c559194209ec7cb179a6e89e6f6cab14339a0))

### [0.3.2](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.1...v0.3.2) (2021-09-25)

### [0.3.1](https://github.com/josdejong/svelte-jsoneditor/compare/v0.3.0...v0.3.1) (2021-09-22)


### Bug Fixes

* clearing the complete document not working (regression since v0.3.0) ([352b110](https://github.com/josdejong/svelte-jsoneditor/commit/352b110b64d5f0563c319cf10278792f2eb994ab))
* do not lose focus and fire a focus/blur event when opening a modal inside the editor ([cbb0c79](https://github.com/josdejong/svelte-jsoneditor/commit/cbb0c79f338972fc36edaa830c13e3a844342490))
* fix formatting of the breaking changes list in CHANGELOG.md ([05d5995](https://github.com/josdejong/svelte-jsoneditor/commit/05d5995700483d581f969d1e343c450b29bf5ec8))
* improve inefficient regex to replace return characters ([f3ae485](https://github.com/josdejong/svelte-jsoneditor/commit/f3ae4855004d6c3cc8db88a2c93ebae03d07cacc))
* scroll cursor into view when moving with arrows left/right ([7ffd586](https://github.com/josdejong/svelte-jsoneditor/commit/7ffd586fbf50dfec16ac519bdba494e1ae36981e))
* show selection with a lighter gray when the editor doesn't have focus ([a57268b](https://github.com/josdejong/svelte-jsoneditor/commit/a57268b317cde564273e57a9daa27f52af038cd8))

## [0.3.0](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.8...v0.3.0) (2021-09-11)


### ⚠ BREAKING CHANGES

* Properties `json` and `text` are replaced by `content: { json, text }`
* Methods `getText`, `setText`, and `updateText` are removed, use `get`, `set` and `update` instead.
* Methods `get` `set`, and `update` now expect and return a content object `{ json: JSON } | { text: string }` instead of the json data.

### Features

* change the API methods to consistently work with `content` instead of `json` and `text` ([6b810b7](https://github.com/josdejong/svelte-jsoneditor/commit/6b810b7f852d6fe6ecfa1b558e2ccf23cf66a265))
* unify properties `json` and `text` inside `content` ([f93ce2d](https://github.com/josdejong/svelte-jsoneditor/commit/f93ce2d053d9515ddcd8bc779106c054348d5254))
* update all dependencies ([2332413](https://github.com/josdejong/svelte-jsoneditor/commit/233241301e8d41fbacc537c89117a0943e3d622d))
* validate content type ([9885ff1](https://github.com/josdejong/svelte-jsoneditor/commit/9885ff109b67c5be088c35b21b5d63083a393585))


### Bug Fixes

* code mode throwing an exception when trying to validate an empty document ([412172b](https://github.com/josdejong/svelte-jsoneditor/commit/412172b11d626d6e1f8f9563fadcf0d88ec78589))
* disable opening of color picker when editor is readOnly ([236ec7a](https://github.com/josdejong/svelte-jsoneditor/commit/236ec7a220f4465d8c8924e1ff854b176f2446a0))
* tooltip font and size not defined ([a9fa438](https://github.com/josdejong/svelte-jsoneditor/commit/a9fa4385e001e4162393f2778fbfde9184b1c372))

### [0.2.8](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.7...v0.2.8) (2021-08-20)


### Features

* create a Svelte examples section ([908d0c4](https://github.com/josdejong/svelte-jsoneditor/commit/908d0c4d4299c467aff84271eca5ad013ced8f88))
* implement color picker ([652e3ac](https://github.com/josdejong/svelte-jsoneditor/commit/652e3ac702328b70e9795b10071338d7ab3f43d3))
* implement method `editor.updateProps(props)` to change properties after creation ([b596155](https://github.com/josdejong/svelte-jsoneditor/commit/b59615531602dfb8b5beae1ad4cb7890dce06007))
* show a time icon with human-readable time in case of unix timestamps ([7d73846](https://github.com/josdejong/svelte-jsoneditor/commit/7d73846c2c986ae3e69f8be143d944c90cd0fd1a))
* update dependencies (`svelte-select`, `sass`) and devDependencies ([be32856](https://github.com/josdejong/svelte-jsoneditor/commit/be3285629fb984131ec6f126f121267a5cf0ebe8))


### Bug Fixes

* display collapsed items sections as selected ([f276863](https://github.com/josdejong/svelte-jsoneditor/commit/f2768638070bf6c011279584d54d26b37948884d))
* upgrade `svelte-select` to `4.3.1` ([c92310a](https://github.com/josdejong/svelte-jsoneditor/commit/c92310a0c3474ac7476056f12b57d1ecf4d9f39c))

### [0.2.7](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.6...v0.2.7) (2021-08-06)


### Features

* sort the navigation bar dropdown items alphabetically ([d85ecb2](https://github.com/josdejong/svelte-jsoneditor/commit/d85ecb29cfcef79751b7ece0e107b555eb4c6093))


### Bug Fixes

* insert before not working when the first item of the root array/object is selected ([8e0043f](https://github.com/josdejong/svelte-jsoneditor/commit/8e0043fb489c1756f81c1b64093942a76aeb1bcd))
* insert before/after not reckoning with multi selection ([c66b2f7](https://github.com/josdejong/svelte-jsoneditor/commit/c66b2f7ca25b5a8f8b96bb599d76aa2394e19f3a))
* navigation bar keys not being unique ([b7bbc5b](https://github.com/josdejong/svelte-jsoneditor/commit/b7bbc5b5b2b771770b47d13c849055db73b3887b))
* position the search box below the navigation bar ([86e50d5](https://github.com/josdejong/svelte-jsoneditor/commit/86e50d5b931ad21811e2be3f53c0c565c12491fe))
* redo of inserting an Array/Object does not correctly restore selection ([148c8fd](https://github.com/josdejong/svelte-jsoneditor/commit/148c8fd87d7c57a1896fc955fa1eac1a7898b263))
* validation error popup not visible when on the first line ([3a6f0be](https://github.com/josdejong/svelte-jsoneditor/commit/3a6f0beb2f3cc4d529e740786eaf7fea74ec0955))

### [0.2.6](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.5...v0.2.6) (2021-08-06)


### Features

* navigation bar implemented in tree mode ([ff93e7b](https://github.com/josdejong/svelte-jsoneditor/commit/ff93e7b23122fbdbb509dc61a0f6204fb31bc1cd))


### Bug Fixes

* when json is changed, clear selection when it refers to a non-existing path ([65c20f0](https://github.com/josdejong/svelte-jsoneditor/commit/65c20f07014241f41225a178d006577a874dd62f))

### [0.2.5](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.4...v0.2.5) (2021-08-04)


### Bug Fixes

* minor styling tweak in the cut/copy dropdown buttons to visualize when dropdown is open ([d2d9561](https://github.com/josdejong/svelte-jsoneditor/commit/d2d956161ccda6d74674304b7f1143dd9cdbae64))

### [0.2.4](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.3...v0.2.4) (2021-08-04)


### Features

* auto scroll up/down when dragging to select multiple nodes ([9e96957](https://github.com/josdejong/svelte-jsoneditor/commit/9e96957855a63002084d40d8a8aa901cb31abbba))
* implement menu options and quick keys to cut/copy without indentation ([1dcbc41](https://github.com/josdejong/svelte-jsoneditor/commit/1dcbc41c8e8c4fdf4c70e66802237538759ca54b))

### [0.2.3](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.2...v0.2.3) (2021-08-04)


### Bug Fixes

* method `transform()` throwing an error ([73e35c1](https://github.com/josdejong/svelte-jsoneditor/commit/73e35c1fecf8f86862b9960dac2e829fa082dcd3))

### [0.2.2](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.1...v0.2.2) (2021-08-04)


### Features

* extend the `transform` method with a callback `onTransform` ([90e8427](https://github.com/josdejong/svelte-jsoneditor/commit/90e8427efe76a36f22a921cf7cf08ed49e51ac53))
* implement method `transform()` and callback `onTransform(operations)` ([08c0f61](https://github.com/josdejong/svelte-jsoneditor/commit/08c0f61b1ef5e23f7268cf1ea44e910ab48b6c51))


### Bug Fixes

* do not expand all contents after extracting some contents ([bb98201](https://github.com/josdejong/svelte-jsoneditor/commit/bb98201e7c3324137972f282371b9a04adf19852))
* do wrap only values anywhere, do not wrap keys anywhere ([5879826](https://github.com/josdejong/svelte-jsoneditor/commit/5879826dd08c9350ec3d381e846b4a150559409c))

### [0.2.1](https://github.com/josdejong/svelte-jsoneditor/compare/v0.2.0...v0.2.1) (2021-08-02)


### Bug Fixes

* file `generated/worker-json-data-url.js` missing in npm package ([861efd2](https://github.com/josdejong/svelte-jsoneditor/commit/861efd2a8d926f28c6b3e64ab0cf8e571c173877))

## [0.2.0](https://github.com/josdejong/svelte-jsoneditor/compare/v0.1.6...v0.2.0) (2021-08-02)


### ⚠ BREAKING CHANGES

* Svelte setup is changed (see readme), ES bundle renamed, UMD bundle removed

### Features

* add search button to main menu of code mode ([0df0f9a](https://github.com/josdejong/svelte-jsoneditor/commit/0df0f9ac2fe3bfc1ea17f0609a32abe2675315e0))
* implement a Cancel to cancel loading a large document in code mode ([ab28a0c](https://github.com/josdejong/svelte-jsoneditor/commit/ab28a0c7f9dea5e8b22a6cd3d7d7b84cb1121d8b))
* migrate to SvelteKit ([c11551d](https://github.com/josdejong/svelte-jsoneditor/commit/c11551da2e4f3f8b40c78f2a9fae225b7ba54773))
* update dependencies (`ajv`, `svelte-select`, `svelte-simple-modal`) ([f9ca5cd](https://github.com/josdejong/svelte-jsoneditor/commit/f9ca5cd709d476a125888c336c7706976e0ab282))
* use quick-key `Backspace` to delete selected contents too (alongside `Delete`) ([f021959](https://github.com/josdejong/svelte-jsoneditor/commit/f0219597e575f8891c8ba8252c22877ddbd57198))


### Bug Fixes

* extract not working when extracting an item from an Array ([5251fb6](https://github.com/josdejong/svelte-jsoneditor/commit/5251fb6d4ff9b7ac92b737a88564f1ef8cddf2f1))
* line height of a single line sometimes being larger than 18px due to icons and tooltip styling ([1431160](https://github.com/josdejong/svelte-jsoneditor/commit/14311609f5e4f38bad9527c4826bcaeaf2e4d099))
* vertical positioning of expand button when selected was a bit off ([d93e4af](https://github.com/josdejong/svelte-jsoneditor/commit/d93e4af7bda6607ddc60670f51dccd1e184ed041))
* wrap long lines ([1792525](https://github.com/josdejong/svelte-jsoneditor/commit/17925255a70dc6ae5a7bdfc58b676aa2377e88b7))

### [0.1.6](https://github.com/josdejong/svelte-jsoneditor/compare/v0.1.5...v0.1.6) (2021-06-30)

### Features

- faster, more robust search ([5e4c3ed](https://github.com/josdejong/svelte-jsoneditor/commit/5e4c3ed8f4c08a19b944172a4089546acc7eab3f))
- implement `readOnly` mode ([31c438f](https://github.com/josdejong/svelte-jsoneditor/commit/31c438fcfb2ce2da76597b6f68efbd5ccddd751e))
- limit the maximum number of search results ([952adb6](https://github.com/josdejong/svelte-jsoneditor/commit/952adb606a3a08867dd12ab533758b70954ec4e1))
- upgrade dependencies (ajv, diff-sequences, svelte-awesome, svelte-select, svelte-simple-modal) ([4469695](https://github.com/josdejong/svelte-jsoneditor/commit/44696953406c697e63477c3f6f13df44c29d2e03))

### Bug Fixes

- color styling issue with selected collapsed items ([720946e](https://github.com/josdejong/svelte-jsoneditor/commit/720946ea51b8357febeb7e0446d6152cf2e010c8))
- do not create selection area inside when in readOnly mode ([03c5b6c](https://github.com/josdejong/svelte-jsoneditor/commit/03c5b6c0fa68b6ca497d5a666bf6760a29ddc895))
- give the user a hint when pasted JSON contents as text ([813a9ca](https://github.com/josdejong/svelte-jsoneditor/commit/813a9ca7f082692edd83cf389420199a3de23f30))
- layout overflowing in case of long unbroken lines ([4d4f15c](https://github.com/josdejong/svelte-jsoneditor/commit/4d4f15cc17f3fe86d265df376783fca7070c51b9))
- prevent submitting parent form when clicking a button in the editor, see [#11](https://github.com/josdejong/svelte-jsoneditor/issues/11) ([64d873a](https://github.com/josdejong/svelte-jsoneditor/commit/64d873afe501d498d753a5e125d2f4f960338e78))
- select area inside array/object after inserting a new array/object ([0d9a1b7](https://github.com/josdejong/svelte-jsoneditor/commit/0d9a1b78c11dc43b4e1190b0f32796e72ae5046a))
- select whole array/object after sorting or transforming it ([0b20741](https://github.com/josdejong/svelte-jsoneditor/commit/0b20741aa7429f7ed74883fc0dda6b97396615a0))
- upgrade to jsonrepair@2.2.1, which has some nice improvements ([a34a558](https://github.com/josdejong/svelte-jsoneditor/commit/a34a55858b292c0a0d47709e3b0cf20992089898))

### [0.1.5](https://github.com/josdejong/svelte-jsoneditor/compare/v0.1.4...v0.1.5) (2021-06-02)

### Features

- refactor TreeMode such that it can hold an empty document, make undo/redo working ([19f18ec](https://github.com/josdejong/svelte-jsoneditor/commit/19f18ec05cbdfb4c25ff81fa1b271cc11222c6d0))
- update dependencies ([f4931c8](https://github.com/josdejong/svelte-jsoneditor/commit/f4931c84d019f1e0d5156d07add2f7978f36e38f))

### Bug Fixes

- "Ok" message after auto repair not working anymore ([e5b6e01](https://github.com/josdejong/svelte-jsoneditor/commit/e5b6e01c6aedb676925ebd97a77666f4d549e8ce))
- editor not getting focus when clicking inside the repair preview ([913ef17](https://github.com/josdejong/svelte-jsoneditor/commit/913ef17a331356aa641c73ec896209cb428aaaaa))
- properly handle repaired/unrepaired text with undo/redo ([1259e48](https://github.com/josdejong/svelte-jsoneditor/commit/1259e488b2e712a27d1a0189154c217b5c5029af))
- solve SCSS warnings ([02854e6](https://github.com/josdejong/svelte-jsoneditor/commit/02854e6e1c8b9a730d66f84434ab8fba463f2e7d))
- solve some SCSS warnings ([2832337](https://github.com/josdejong/svelte-jsoneditor/commit/28323370f1a710cfccc8deec544c0cc87a36fd9a))
- some fixes in ensuring a selection in case of an empty document ([ed14a8c](https://github.com/josdejong/svelte-jsoneditor/commit/ed14a8ca95b47ac2dbcef9f7809e48615befb0bc))
- transform and sort not triggering a change event ([3b16a21](https://github.com/josdejong/svelte-jsoneditor/commit/3b16a2158e5d925e3abfa80030858ccb44dacff4))

### [0.1.4](https://github.com/josdejong/svelte-jsoneditor/compare/v0.1.3...v0.1.4) (2021-05-26)

### Bug Fixes

- clear old files from `dist` folder before bundling ([59d1ec0](https://github.com/josdejong/svelte-jsoneditor/commit/59d1ec080fd6eb70401424ffee0b27452c24114c))

### [0.1.3](https://github.com/josdejong/svelte-jsoneditor/compare/v0.1.2...v0.1.3) (2021-05-26)

### Bug Fixes

- generated files missing in published npm package ([c63b1c1](https://github.com/josdejong/svelte-jsoneditor/commit/c63b1c11d6cfd7d98e8cfe65c00a34b17f061da6))

### [0.1.2](https://github.com/josdejong/svelte-jsoneditor/compare/v0.0.21...v0.1.2) (2021-05-26)

### Features

- link to source code for Svelte component usage, describe how to setup required preprocessors ([72f04b4](https://github.com/josdejong/svelte-jsoneditor/commit/72f04b4e053398c189101d174ae501eae964bdef))

### Bug Fixes

- changing validator not triggering an update in CodeMode ([5b4866e](https://github.com/josdejong/svelte-jsoneditor/commit/5b4866eb64c199b4f5a1cb4ba911edc737ba7ae5))

### [0.0.21](https://github.com/josdejong/svelte-jsoneditor/compare/v0.0.20...v0.0.21) (2021-05-13)

### Features

- implement validation errors overview and validation error annotations in code mode ([#6](https://github.com/josdejong/svelte-jsoneditor/issues/6)) ([b206f10](https://github.com/josdejong/svelte-jsoneditor/commit/b206f10330bb7eae5db25dbdb5c45c25a55c1869))

### Bug Fixes

- validation errors on an object/array not visible when expanded ([d77ae5b](https://github.com/josdejong/svelte-jsoneditor/commit/d77ae5bad3ecccc0dd3609d20e89984d7ec14585))

### [0.0.20](https://github.com/josdejong/svelte-jsoneditor/compare/v0.0.19...v0.0.20) (2021-05-12)

### Bug Fixes

- alignment of context menu when clicking the context menu button of the main menu ([f4c0c5e](https://github.com/josdejong/svelte-jsoneditor/commit/f4c0c5e675ccb5800d1281c346c732ff25e1f6d9))
- let "Remove" remove the whole item/entry when a key or value is selected ([ca1bcec](https://github.com/josdejong/svelte-jsoneditor/commit/ca1bcece14ffe173c73cfc1fad70d0cdcf99230e))

### [0.0.19](https://github.com/josdejong/svelte-jsoneditor/compare/v0.0.18...v0.0.19) (2021-04-28)

### Bug Fixes

- fix empty changelog ([090003a](https://github.com/josdejong/svelte-jsoneditor/commit/090003a8bcc3b3c7068a61210cc87f06ded7d284))
- fix linting issues ([6ab1fc1](https://github.com/josdejong/svelte-jsoneditor/commit/6ab1fc1f57a688468940690c5fc91dcae9808e9e))

### [0.0.18](https://github.com/josdejong/svelte-jsoneditor/compare/v0.0.17...v0.0.18) (2021-04-28)

- Setup tooling for releases (standard-version, commitlint, husky)

### [0.0.17](https://github.com/josdejong/svelte-jsoneditor/compare/v0.0.16...v0.0.17) (2021-04-28)

- Setup tooling for releases (standard-version, commitlint, husky)

### 0.0.16 (2021-04-28)

- Implemented context menu.
- Many small refinements.
