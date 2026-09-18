import type { Language } from '$lib/types'

export const french: Language = {
  langCode: 'fr-FR',
  values: {
    Ok: 'Ok',
    filter: 'Filtrer',
    loading: 'chargement',
    Extract: 'Extraire',
    View: 'Afficher',
    Edit: 'Modifier',
    sort: 'Trier',
    showMe: 'Afficher',
    cancel: 'Annuler',
    moveToError: "Aller à l'emplacement de l'erreur de syntaxe",
    autoRepair: 'Réparation automatique',
    autoRepairJson: 'Réparer automatiquement le JSON',
    // TextMode
    cancelFolding: 'Annuler le repliement',
    openAnyWay: 'Ouvrir quand même',
    openTextModeWarning:
      'Ouvrir le document en mode texte. Cela peut bloquer ou faire planter votre navigateur.',
    openTreeMode: 'Ouvrir en mode arborescence',
    openTreeModeDescription:
      'Ouvrir le document en mode arborescence. Ce mode peut traiter les documents volumineux.',
    cancelLargeDocument: "Annuler l'ouverture de ce document volumineux.",
    confirmFormatJson: 'Voulez-vous formater le JSON ?',
    format: 'Formater',
    noThanks: 'Non merci',
    closeMessage: 'Fermer ce message',
    jsonTooLargeWarning:
      "Le document JSON dépasse {{maxSize}} et peut faire planter votre navigateur s'il est chargé en mode texte. Taille réelle : {{actualSize}}.",
    item: 'élément',
    items: 'éléments',
    editNestedContent: 'Modifier le contenu imbriqué',
    contents: 'Contenu',
    back: 'Retour',
    apply: 'Appliquer',
    selectQueryLanguage: 'Sélectionner un langage de requête',
    pick: 'Sélectionner',
    language: 'Langage',
    wizard: 'Assistant',
    wizardInfo: 'Disponible uniquement pour les tableaux, pas pour les objets',
    query: 'Requête',
    docRoot: 'racine du document',
    itemRoot: "racine de l'élément",
    pleaseSelect: 'Veuillez sélectionner',

    // TreeMode messages
    invalidJsonNotRepairable:
      "Le document JSON chargé est invalide et n'a pas pu être réparé automatiquement.",
    repairManually: 'Réparer manuellement',
    repairManuallyTitle: 'Ouvrir le document en mode « code » et le réparer manuellement',
    pastedJsonAsText: 'Vous avez collé un {{type}} JSON en tant que texte',
    pasteAsJson: 'Coller en tant que JSON',
    pastTextAsJson: "Coller le texte en tant que JSON plutôt qu'en tant que valeur unique",
    keepAsSingleValue: 'Conserver le contenu collé en tant que valeur unique',
    replaceValueWithJson: 'Remplacer la valeur par le JSON collé',
    leaveAsIsTitle: 'Conserver le JSON intégré dans la valeur',
    multilinePastedAsArray: 'Le texte multiligne a été collé en tant que tableau',
    pasteAsStrInstead: 'Coller en tant que chaîne',
    pasteAsStrInsteadTitle:
      "Coller le contenu du presse-papiers en tant que chaîne unique plutôt qu'en tant que tableau",
    autoRepairSuccess: 'Le document JSON chargé était invalide mais a été réparé avec succès.',
    acceptRepair: 'Ok',
    acceptRepairTitle: 'Accepter le document réparé',
    repairManuallyInsteadTitle: 'Laisser le document inchangé et le réparer manuellement',
    insertExplanation:
      'Insérez ou collez du contenu, saisissez [ pour insérer un nouveau tableau, { pour insérer un nouvel objet, ou commencez à saisir pour insérer une nouvelle valeur',

    // Menu titles
    expandAll: 'Tout déplier',
    collapseAll: 'Tout replier',
    search: 'Rechercher',
    transformContents: 'Transformer le contenu (filtrer, trier, projeter)',
    contextMenuExplanation:
      'Ouvrir le menu contextuel (cliquez ici, faites un clic droit sur la sélection, ou utilisez le bouton de menu contextuel ou Ctrl+Q)',

    undo: 'Annuler',
    redo: 'Rétablir',
    copy: 'Copier',

    formatJson: 'Formater le JSON : ajouter une indentation et des sauts de ligne',
    compactJson: 'Compacter le JSON : supprimer les espaces et les sauts de ligne',

    // SearchBox messages
    toggleReplaceOptions: 'Afficher ou masquer les options de remplacement (Ctrl+H)',
    enterTextSearch: 'Saisir le texte à rechercher',
    findPlaceholder: 'Rechercher',
    nextResult: 'Aller au résultat suivant (Entrée)',
    prevResult: 'Aller au résultat précédent (Maj+Entrée)',
    closeSearch: 'Fermer la recherche (Échap)',
    enterReplaceText: 'Saisir le texte de remplacement',
    replace: 'Remplacer',
    replaceAll: 'Tout',
    replaceCtrlEnter: "Remplacer l'occurrence actuelle (Ctrl+Entrée)",
    replaceAllTitle: 'Remplacer toutes les occurrences',

    // Sort direction names
    sortAscending: 'croissant',
    sortDescending: 'décroissant',

    // Mode switching messages
    modeText: 'texte',
    modeTree: 'arborescence',
    modeTable: 'tableau',
    switchToTextMode: 'Passer en mode texte',
    switchToTreeMode: 'Passer en mode arborescence',
    switchToTableMode: 'Passer en mode tableau',
    currentMode: '(mode actuel : {{mode}})',

    //Table mode
    failedToValidate: 'Échec de la validation : ',
    tipContextMenu:
      'Astuce : vous pouvez ouvrir ce menu contextuel par un clic droit ou avec Ctrl+Q',
    YouPastedAJsonMessage: 'Vous avez collé un {{content}} JSON en tant que texte',
    multilineTextPastedMessage: 'Le texte multiligne a été collé en tant que tableau',
    pasteAsStringInstead: 'Coller en tant que chaîne',
    pastSingleString:
      "Coller le contenu du presse-papiers en tant que chaîne unique plutôt qu'en tant que tableau",
    leaveAsIs: 'Laisser tel quel',
    keepThePastedArray: 'Conserver le tableau collé',
    textRepairedSuccessMessage:
      'Le document JSON chargé était invalide mais a été réparé avec succès.',
    acceptRepairedDocument: 'Accepter le document réparé',
    leaveTheDocUnchanged: 'Laisser le document inchangé et le réparer manuellement',
    manuallyRepairWithCodeModeText:
      'Ouvrir le document en mode « code » et le réparer manuellement',
    tableCell: 'Cellule du tableau',
    tableRow: 'Ligne du tableau',

    // Table mode welcome
    objectWithNestedArrays: 'Objet contenant des tableaux imbriqués',
    emptyDocument: 'Un document vide',
    anObject: 'Un objet',
    emptyArray: 'Un tableau vide',
    withValueType: 'Un {{valueType}}',
    objectCannotBeOpened:
      'Un objet ne peut pas être ouvert en mode tableau. Vous pouvez ouvrir un tableau imbriqué, ou ouvrir le document en mode arborescence.',
    emptyDocCannotBeOpened:
      'Un document vide ne peut pas être ouvert en mode tableau. Vous pouvez passer en mode arborescence, ou coller un tableau JSON avec',
    docCannotBeOpened:
      '{{doc}} ne peut pas être ouvert en mode tableau. Vous pouvez ouvrir le document en mode arborescence.',

    // Context menu
    editKey: 'Modifier la clé',
    paste: 'Coller',
    remove: 'Supprimer',
    editRow: 'Modifier la ligne',
    editCurrentRow: 'Modifier la ligne actuelle',
    duplicateRow: 'Dupliquer la ligne',
    duplicateCurrentRow: 'Dupliquer la ligne actuelle',
    insertBefore: 'Insérer avant',
    insertRowBeforeCurrentRow: 'Insérer une ligne avant la ligne actuelle',
    insertAfter: 'Insérer après',
    insertRowAfterCurrentRow: 'Insérer une ligne après la ligne actuelle',
    removeRow: 'Supprimer la ligne',
    removeCurrentRow: 'Supprimer la ligne actuelle',
    cut: 'Couper',
    cutFormattedTitle: 'Couper le contenu sélectionné, avec indentation',
    cutCompactedTitle: 'Couper le contenu sélectionné, sans indentation',
    copyWithIndent: 'Copier le contenu sélectionné, avec indentation',
    copyWithoutIndent: 'Copier le contenu sélectionné, sans indentation',
    pasteTitle: 'Coller le contenu du presse-papiers',
    removeSelected: 'Supprimer le contenu sélectionné',
    copyFormatted: 'Copier avec indentation',
    copyCompacted: 'Copier sans indentation',
    enforceString: 'Forcer en chaîne',
    enforceKeepingTheValue:
      "Forcer la conservation de la valeur en tant que chaîne lorsqu'elle contient un nombre",
    editValue: 'Modifier la valeur',
    doubleClickOnValue: 'Double-cliquez sur la valeur',
    cutFormatted: 'Couper avec indentation',
    cutCompacted: 'Couper sans indentation',
    extractSelectedContent: 'Extraire le contenu sélectionné',
    duplicate: 'Dupliquer',
    duplicateSelectedContents: 'Dupliquer le contenu sélectionné',
    editArray: 'Modifier le tableau',
    editObject: "Modifier l'objet",
    convertTo: 'Convertir en',
    insert: 'Insérer',
    editTheKey: 'Modifier la clé',
    doubleClickOnKey: 'Double-cliquez sur la clé',
    sortArrayOrObject: "Trier le contenu du tableau ou de l'objet",
    transform: 'Transformer',
    transformArrayOrObject:
      "Transformer le contenu du tableau ou de l'objet (filtrer, trier, projeter)",
    structure: 'Structure',
    structureTitle: 'structure identique au premier élément du tableau',
    object: 'Objet',
    array: 'Tableau',
    value: 'Valeur',
    selectAreaBeforeCurrentEntry:
      "Sélectionner la zone avant l'entrée actuelle pour insérer ou coller du contenu",
    selectAreaAfterCurrentEntry:
      "Sélectionner la zone après l'entrée actuelle pour insérer ou coller du contenu",

    // Sort dialog
    path: 'Chemin',
    sortObjectKeys: "Trier les clés de l'objet",
    sortArrayItems: 'Trier les éléments du tableau',
    selectedPath: 'Chemin sélectionné',
    direction: 'Sens',
    property: 'Propriété',
    original: 'Original',
    preview: 'Aperçu',
    collapseValidationErrors: 'Replier les erreurs de validation',
    cancelRepair: 'Annuler la réparation',
    scrollToError: "Aller à l'emplacement de l'erreur",
    applyFixedJson: 'Appliquer le JSON corrigé',
    jsonIsValidNow: 'Le JSON est maintenant valide et peut être analysé.',
    repairInvalidJson: 'Corrigez le JSON invalide, puis cliquez sur Appliquer',
    cannotParseJson: "Impossible d'analyser le JSON",
    toggleFullScreen: 'Activer ou désactiver le plein écran',
    copyingAndPasting: 'Copier et coller',
    copyPathToClipboard: 'Copier le chemin sélectionné dans le presse-papiers',
    limitedToItems: 'Limité à {{count}} éléments',
    expandOrCollapseArray:
      'Déplier ou replier ce tableau (Ctrl+Clic pour déplier/replier récursivement)',
    expandOrCollapseObject:
      'Déplier ou replier cet objet (Ctrl+Clic pour déplier/replier récursivement)',
    time: 'Heure',
    containsInvalidData: 'Contient des données invalides',
    validationTurnedOff: 'Validation désactivée : le document est trop volumineux',
    emptyDocumentTitle: 'Document vide',
    createObject: 'Créer un objet',
    createArray: 'Créer un tableau',
    collapsing: 'Repliement',
    cancelEditingPath: 'Annuler la modification du chemin sélectionné',
    editSelectedPath: 'Modifier le chemin sélectionné',
    navigationBar: 'Barre de navigation',
    columnsSampledWarning:
      "Les colonnes sont créées à partir d'un échantillon de {{maxSampleCount}} éléments sur {{count}}. S'il manque une colonne, cliquez ici pour utiliser tous les éléments au lieu d'un échantillon. C'est plus lent.",
    openColorPicker: 'Cliquez pour ouvrir un sélecteur de couleur',
    colorValue: 'Couleur {{value}}',
    toggleBooleanValue: 'Cliquez pour inverser cette valeur booléenne',
    booleanValue: 'Valeur booléenne {{value}}',
    ctrlClickToOpenUrl: "Ctrl+Clic ou Ctrl+Entrée pour ouvrir l'url dans une nouvelle fenêtre"
  }
}
