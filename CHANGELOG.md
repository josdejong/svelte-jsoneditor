# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
