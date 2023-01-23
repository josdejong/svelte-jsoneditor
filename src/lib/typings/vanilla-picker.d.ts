declare module 'vanilla-picker' {
  interface Color {
    rgba: number[]
    hsla: number[]
    rgbString: string
    rgbaString: string
    hslString: string
    hslaString: string
    hex: string
  }

  type ColorCallback = (color: Color) => void

  interface Options {
    parent?: HTMLElement
    popup?: 'top' | 'bottom' | 'left' | 'right' | false
    template?: string
    layout?: string
    alpha?: boolean
    editor?: boolean
    editorFormat?: 'hex' | 'hsl' | 'rgb'
    cancelButton?: boolean
    color?: string
    onChange?: ColorCallback
    onDone?: ColorCallback
    onOpen?: ColorCallback
    onClose?: ColorCallback
  }

  type Configuration = Options | HTMLElement

  class Picker {
    constructor(options: Configuration)
    onChange: ColorCallback
    onDone: ColorCallback
    onOpen: ColorCallback
    onClose: ColorCallback
    setOptions(options: Configuration): void
    openHandler(e: Event): void
    closeHandler(e: Event): void
    movePopup(options: Options, open: boolean): void
    setColor(color: string | number[], silent: boolean): void
    setColour: Picker['setColor']
    show(): boolean
    hide(): boolean
    destroy(): void
  }

  export default Picker
}
