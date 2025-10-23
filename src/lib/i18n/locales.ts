import type { Language } from '$lib/types'

export const english: Language = {
  landCode: 'en-US',
  values: {
    Ok: 'Ok',
    loading: 'loading',
    Extract: 'Extract',
    View: 'View',
    Edit: 'Edit',
    sort: 'Sort',
    showMe: 'Show me',
    cancel: 'Cancel',
    moveToTheParseErrorLocation: 'Move to the parse error location',
    autoRepair: 'Auto repair',
    autoRepairJson: 'Automatically repair JSON',
    // TextMode
    cancelFolding: 'Cancel folding',
    openAnyWay: 'Open anyway',
    openTextModeWarning: 'Open the document in text mode. This may freeze or crash your browser.',
    openTreeMode: 'Open in tree mode',
    openTreeModeDescription:
      'Open the document in tree mode. Tree mode can handle large documents.',
    cancelLargeDocument: 'Cancel opening this large document.',
    confirmFormatJson: 'Do you want to format the JSON?',
    format: 'Format',
    formatJsonDescription: 'Format JSON: add proper indentation and new lines (Ctrl+I)',
    noThanks: 'No thanks',
    closeMessage: 'Close this message',
    jsonTooLargeWarning:
      'The JSON document is larger than {{maxSize}}, and may crash your browser when loading it in text mode. Actual size: {{actualSize}}.',
    item: 'item',
    items: 'items',
    editNestedContent: 'Edit nested content',
    contents: 'Contents',
    back: 'Back',
    apply: 'Apply',

    // TreeMode messages
    invalidJsonNotRepairable:
      'The loaded JSON document is invalid and could not be repaired automatically.',
    repairManually: 'Repair manually',
    repairManuallyTitle: 'Open the document in "code" mode and repair it manually',
    pastedJsonAsText: 'You pasted a JSON {{type}} as text',
    pastedJsonArray: 'array',
    pastedJsonObject: 'object',
    pasteAsJson: 'Paste as JSON instead',
    pasteAsJsonTitle: 'Replace the value with the pasted JSON',
    leaveAsIsTitle: 'Keep the JSON embedded in the value',
    multilinePastedAsArray: 'Multiline text was pasted as array',
    pasteAsStrInstead: 'Paste as string instead',
    pasteAsStrInsteadTitle: 'Paste the clipboard data as a single string value instead of an array',
    autoRepairSuccess: 'The loaded JSON document was invalid but is successfully repaired.',
    acceptRepair: 'Ok',
    acceptRepairTitle: 'Accept the repaired document',
    repairManuallyInstead: 'Repair manually instead',
    repairManuallyInsteadTitle: 'Leave the document unchanged and repair it manually instead',
    insertExplanation:
      'Insert or paste contents, enter [ insert a new array, enter { to insert a new object, or start typing to insert a new value',

    // Menu titles
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    searchCtrlF: 'Search (Ctrl+F)',
    transformContents: 'Transform contents (filter, sort, project)',
    contextMenuExplanation:
      'Open context menu (Click here, right-click on the selection, or use the context menu button or Ctrl+Q)',

    undo: 'Undo',
    redo: 'Redo',
    copy: 'Copy',

    formatJson: 'Format JSON: add proper indentation and new lines',
    compactJson: 'Compact JSON: remove all white spacing and new lines',

    // SearchBox messages
    toggleReplaceOptions: 'Toggle visibility of replace options (Ctrl+H)',
    enterTextSearch: 'Enter text to search',
    findPlaceholder: 'Find',
    nextResult: 'Go to next search result (Enter)',
    prevResult: 'Go to previous search result (Shift+Enter)',
    closeSearch: 'Close search box (Esc)',
    enterReplaceText: 'Enter replacement text',
    replace: 'Replace',
    replaceAll: 'All',
    replaceCtrlEnter: 'Replace current occurrence (Ctrl+Enter)',
    replaceAllTitle: 'Replace all occurrences',

    // Sort direction names
    sortAscending: 'ascending',
    sortDescending: 'descending',

    // Mode switching messages
    modeText: 'text',
    modeTree: 'tree',
    modeTable: 'table',
    switchToTextMode: 'Switch to text mode',
    switchToTreeMode: 'Switch to tree mode',
    switchToTableMode: 'Switch to table mode',
    currentMode: '(current mode: {{mode}})',

    //Table mode
    failedToValidate: 'Failed to validate: ',
    tipContextMenu: 'Tip: you can open this context menu via right-click or with Ctrl+Q',
    YouPastedAJsonMessage: 'You pasted a JSON {{content}} as text',
    multilineTextPastedMessage: 'Multiline text was pasted as array',
    pasteAsStringInstead: 'Paste as string instead',
    pastTheClipboardDataAsStingeStringValue:
      'Paste the clipboard data as a single string value instead of an array',
    leaveAsIs: 'Leave as is',
    keepThePastedArray: 'Keep the pasted array',
    textRepairedSuccessMessage:
      'The loaded JSON document was invalid but is successfully repaired.',
    acceptRepairedDocument: 'Accept the repaired document',
    leaveTheDocUnchanged: 'Leave the document unchanged and repair it manually instead',
    manuallyRepairWithCodeModeText: 'Open the document in "code" mode and repair it manually',

    // Table mode welcome
    objectWithNestedArrays: 'Object with nested arrays',
    emptyDocument: 'An empty document',
    anObject: 'An object',
    emptyArray: 'An empty array',
    withValueType: 'A {{valueType}}',
    messageObjectCannotBeOpenedInTableMode:
      'An object cannot be opened in table mode. You can open a nested array instead, or open the document in tree mode.',
    messageEmptyDocCannotBeOpenedInTableMode:
      'An empty document cannot be opened in table mode. You can go to tree mode instead, or paste a JSON Array using',
    messageDocTypeCannotBeOpenedInTableMode:
      '{{doc}} cannot be opened in table mode. You can open the document in tree mode instead.',

    // Context menu
    editKey: 'Edit key',
    paste: 'Paste',
    remove: 'Remove',
    editRow: 'Edit row',
    editCurrentRow: 'Edit the current row',
    duplicateRow: 'Duplicate row',
    duplicateCurrentRow: 'Duplicate the current row',
    insertBefore: 'Insert before',
    insertRowBeforeCurrentRow: 'Insert a row before the current row',
    insertAfter: 'Insert after',
    insertRowAfterCurrentRow: 'Insert a row after the current row',
    removeRow: 'Remove row',
    removeCurrentRow: 'Remove current row',
    cut: 'Cut',
    cutSelectedContentFormattedWithIndentation: 'Cut selected contents, formatted with indentation',
    cutSelectedContentWithoutIndent: 'Cut selected contents, without indentation',
    copySelectedContendWithIndent: 'Copy selected contents, formatted with indentation',
    copySelectedContendWithoutIndent: 'Copy selected contents, without indentation',
    pastClipboardContent: 'Paste clipboard contents',
    removeSelected: 'Remove selected contents',
    copyFormatted: 'Copy formatted',
    copyCompacted: 'Copy compacted',
    enforceString: 'Enforce string',
    enforceKeepingTheValue: 'Enforce keeping the value as string when it contains a numeric value',
    editValue: 'Edit the value',
    cutFormatted: 'Cut formatted',
    cutCompacted: 'Cut compacted',
    extractSelectedContent: 'Extract selected contents',
    duplicate: 'Duplicate',
    duplicateSelectedContents: 'Duplicate selected contents',
    editArray: 'Edit array',
    editObject: 'Edit object',
    convertTo: 'Convert to',
    insert: 'Insert',
    editTheKey: 'Edit the key',
    sortArrayOrObjectContents: 'Sort array or object contents',
    transform: 'Transform',
    transformArrayOrObject: 'Transform array or object contents (filter, sort, project)',
    structure: 'Structure',
    structureTitle: 'structure like the first item in the array',
    object: 'Object',
    array: 'Array',
    value: 'Value',
    selectAreaBeforeCurrentEntry: 'Select area before current entry to insert or paste contents',
    selectAreaAfterCurrentEntry: 'Select area after current entry to insert or paste contents',

    // Sort dialog
    path: 'Path',
    sortObjectKeys: 'Sort object keys',
    sortArrayItems: 'Sort array items',
    selectedPath: 'Selected path',
    direction: 'Direction',
    property: 'Property'
  }
}

export const russia: Language = {
  landCode: 'ru-RU',
  values: {
    Ok: 'Ок',
    loading: 'загрузка',
    Extract: 'Извлечь',
    View: 'Просмотр',
    Edit: 'Редактировать',
    sort: 'Сортировать',
    anObject: 'Объект',
    insertExplanation:
      'Вставьте или вставьте содержимое, введите [, чтобы вставить новый массив, введите {, чтобы вставить новый объект, или начните вводить для вставки нового значения',
    showMe: 'Show me',
    moveToTheParseErrorLocation: 'Move to the parse error location',
    autoRepair: 'Auto repair',
    autoRepairJson: 'Automatically repair JSON',
    cancel: 'Отмена',
    // TextMode
    cancelFolding: 'Отменить сворачивание',
    openAnyWay: 'Открыть в любом случае',
    openTextModeWarning:
      'Открыть документ в текстовом режиме. Это может привести к зависанию или сбою браузера.',
    openTreeMode: 'Открыть в режиме дерева',
    openTreeModeDescription:
      'Открыть документ в режиме дерева. Режим дерева может обрабатывать большие документы.',
    cancelLargeDocument: 'Отменить открытие этого большого документа.',
    confirmFormatJson: 'Вы хотите отформатировать JSON?',
    format: 'Форматировать',
    formatJsonDescription:
      'Форматировать JSON: добавить правильные отступы и переносы строк (Ctrl+I)',
    noThanks: 'Нет, спасибо',
    closeMessage: 'Закрыть это сообщение',
    jsonTooLargeWarning:
      'Документ JSON превышает размер {{maxSize}} и может привести к сбою браузера при загрузке в текстовом режиме. Фактический размер: {{actualSize}}.',
    item: 'шт',
    items: 'шт',
    editNestedContent: 'Редактировать вложенный контент',
    contents: 'Содержание',
    back: 'Вернуться',
    apply: 'Подтвердить',

    // TreeMode messages
    invalidJsonNotRepairable:
      'Загруженный JSON-документ содержит ошибки и не может быть автоматически восстановлен.',
    repairManually: 'Исправить вручную',
    repairManuallyTitle: 'Откройте документ в режиме «код» и исправьте его вручную',
    pastedJsonAsText: 'Вы вставили JSON {{type}} как текст',
    pastedJsonArray: 'массив',
    pastedJsonObject: 'объект',
    pasteAsJson: 'Вставить как JSON',
    pasteAsJsonTitle: 'Заменить значение вставленным JSON',
    leaveAsIs: 'Оставить как есть',
    leaveAsIsTitle: 'Сохранить JSON встроенным в значение',
    multilinePastedAsArray: 'Многострочный текст был вставлен как массив',
    pasteAsStrInstead: 'Вставить как строку',
    pasteAsStrInsteadTitle: 'Вставить данные буфера обмена как одну строку вместо массива',
    autoRepairSuccess: 'Загруженный JSON-документ был некорректным, но успешно восстановлен.',
    acceptRepair: 'Ок',
    acceptRepairTitle: 'Принять восстановленный документ',
    repairManuallyInstead: 'Исправить вручную',
    repairManuallyInsteadTitle: 'Оставить документ без изменений и исправить вручную',

    // Menu titles
    expandAll: 'Развернуть всё',
    collapseAll: 'Свернуть всё',
    searchCtrlF: 'Поиск (Ctrl+F)',
    transformContents: 'Преобразовать содержимое (фильтр, сортировка, проекция)',
    contextMenuExplanation:
      'Открыть контекстное меню (нажмите здесь, щёлкните правой кнопкой по выделению или используйте Ctrl+Q)',
    undo: 'Отменить',
    redo: 'Повторить',
    copy: 'Копировать',

    formatJson: 'Форматировать JSON: добавить отступы и переносы строк',
    compactJson: 'Компактный JSON: удалить все пробелы и переносы строк',

    // SearchBox messages
    toggleReplaceOptions: 'Показать/скрыть параметры замены (Ctrl+H)',
    enterTextSearch: 'Введите текст для поиска',
    findPlaceholder: 'Найти',
    nextResult: 'Перейти к следующему результату (Enter)',
    prevResult: 'Перейти к предыдущему результату (Shift+Enter)',
    closeSearch: 'Закрыть поиск (Esc)',
    enterReplaceText: 'Введите текст для замены',
    replace: 'Заменить',
    replaceAll: 'Все',
    replaceCtrlEnter: 'Заменить текущее вхождение (Ctrl+Enter)',
    replaceAllTitle: 'Заменить все вхождения',

    // Sort direction names
    sortAscending: 'по возрастанию',
    sortDescending: 'по убыванию',

    // Mode switching messages
    modeText: 'текст',
    modeTree: 'дерево',
    modeTable: 'таблица',
    switchToTextMode: 'Переключить в текстовый режим',
    switchToTreeMode: 'Переключить в режим дерева',
    switchToTableMode: 'Переключить в табличный режим',
    currentMode: '(текущий режим: {{mode}})',

    // Table mode
    failedToValidate: 'Не удалось проверить: ',
    tipContextMenu: 'Подсказка: откройте контекстное меню правой кнопкой или с помощью Ctrl+Q',
    YouPastedAJsonMessage: 'Вы вставили JSON {{content}} как текст',
    multilineTextPastedMessage: 'Многострочный текст был вставлен как массив',
    pasteAsStringInstead: 'Вставить как строку',
    pastTheClipboardDataAsStingeStringValue:
      'Вставить данные буфера обмена как одну строку вместо массива',
    keepThePastedArray: 'Сохранить вставленный массив',
    textRepairedSuccessMessage:
      'Загруженный JSON-документ был некорректным, но успешно восстановлен.',
    acceptRepairedDocument: 'Принять восстановленный документ',
    leaveTheDocUnchanged: 'Оставить документ без изменений и исправить вручную',
    manuallyRepairWithCodeModeText: 'Откройте документ в режиме «код» и исправьте вручную',

    // Table mode welcome
    objectWithNestedArrays: 'Объект с вложенными массивами',
    emptyDocument: 'Пустой документ',
    object: 'Объект',
    emptyArray: 'Пустой массив',
    withValueType: '{{valueType}}',
    messageObjectCannotBeOpenedInTableMode:
      'Объект нельзя открыть в табличном режиме. Вы можете открыть вложенный массив или переключиться в режим дерева.',
    messageEmptyDocCannotBeOpenedInTableMode:
      'Пустой документ нельзя открыть в табличном режиме. Перейдите в режим дерева или вставьте JSON-массив с помощью',
    messageDocTypeCannotBeOpenedInTableMode:
      '{{doc}} нельзя открыть в табличном режиме. Вы можете открыть документ в режиме дерева.',

    // Context menu
    editKey: 'Редактировать ключ',
    paste: 'Вставить',
    remove: 'Удалить',
    editRow: 'Редактировать строку',
    editCurrentRow: 'Редактировать текущую строку',
    duplicateRow: 'Дублировать строку',
    duplicateCurrentRow: 'Дублировать текущую строку',
    insertBefore: 'Вставить перед',
    insertRowBeforeCurrentRow: 'Вставить строку перед текущей',
    insertAfter: 'Вставить после',
    insertRowAfterCurrentRow: 'Вставить строку после текущей',
    removeRow: 'Удалить строку',
    removeCurrentRow: 'Удалить текущую строку',
    cut: 'Вырезать',
    cutSelectedContentFormattedWithIndentation: 'Вырезать выделенное с сохранением отступов',
    cutSelectedContentWithoutIndent: 'Вырезать выделенное без отступов',
    copySelectedContendWithIndent: 'Копировать выделенное с отступами',
    copySelectedContendWithoutIndent: 'Копировать выделенное без отступов',
    pastClipboardContent: 'Вставить содержимое из буфера обмена',
    removeSelected: 'Удалить выделенное',
    copyFormatted: 'Копировать с форматированием',
    copyCompacted: 'Копировать в компактном виде',
    enforceString: 'Принудительно строка',
    enforceKeepingTheValue: 'Сохранять значение как строку, если оно содержит число',
    editValue: 'Редактировать значение',
    cutFormatted: 'Вырезать с форматированием',
    cutCompacted: 'Вырезать в компактном виде',
    extractSelectedContent: 'Извлечь выделенное',
    duplicate: 'Дублировать',
    duplicateSelectedContents: 'Дублировать выделенное',
    editArray: 'Редактировать массив',
    editObject: 'Редактировать объект',
    convertTo: 'Преобразовать в',
    insert: 'Вставить',
    editTheKey: 'Редактировать ключ',
    sortArrayOrObjectContents: 'Сортировать содержимое массива или объекта',
    transform: 'Преобразовать',
    transformArrayOrObject:
      'Преобразовать содержимое массива или объекта (фильтр, сортировка, проекция)',
    structure: 'Структура',
    structureTitle: 'Структура как у первого элемента массива',
    array: 'Массив',
    value: 'Значение',
    selectAreaBeforeCurrentEntry:
      'Выбрать область перед текущим элементом для вставки или добавления содержимого',
    selectAreaAfterCurrentEntry:
      'Выбрать область после текущего элемента для вставки или добавления содержимого',

    // Sort dialog
    path: 'Путь',
    sortObjectKeys: 'Сортировать ключи объекта',
    sortArrayItems: 'Сортировать элементы массива',
    selectedPath: 'Выбранный путь',
    direction: 'Направление',
    property: 'Свойство'
  }
}
