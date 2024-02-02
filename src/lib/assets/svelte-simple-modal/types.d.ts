// This file is copied from svelte-simple-modal as a workaround for the types not being found:
//
//     Svelte: Cannot find module svelte-simple-modal or its corresponding type declarations.
//
// Version: svelte-simple-modal@1.6.1, date: 2023-12-15
//
// Additionally: the type `Component` is extended with the following to fix some issues:
//
//     | typeof import('svelte').SvelteComponent<Record<string, unknown>>

declare module 'svelte-simple-modal' {
  import type { SvelteComponent } from 'svelte'

  /**
   * Create a Svelte component with props bound to it.
   */
  export declare function bind(component: Component, props: Record<string, unknown>): Component

  export type Component =
    | typeof import('svelte').SvelteComponent
    | typeof import('svelte').SvelteComponent<unknown>
    | typeof import('svelte').SvelteComponent<Record<string, unknown>>

  export type BlurParams = import('svelte/types/runtime/transition').BlurParams

  export type FadeParams = import('svelte/types/runtime/transition').FadeParams

  export type FlyParams = import('svelte/types/runtime/transition').FlyParams

  export type SlideParams = import('svelte/types/runtime/transition').SlideParams

  export type TransitionConfig = import('svelte/types/runtime/transition').TransitionConfig

  export type Styles = Record<string, string | number>

  export type TransitionFn = (
    node: Element,
    parameters: BlurParams | FadeParams | FlyParams | SlideParams
  ) => TransitionConfig

  export interface Options {
    id: string | null
    ariaLabel: string | null
    ariaLabelledBy: string | null
    closeButton: Component | boolean
    closeOnEsc: boolean
    closeOnOuterClick: boolean
    styleBg: Styles
    styleWindowWrap: Styles
    styleWindow: Styles
    styleContent: Styles
    styleCloseButton: Styles
    classBg: string | null
    classWindowWrap: string | null
    classWindow: string | null
    classContent: string | null
    classCloseButton: string | null
    transitionBg: TransitionFn
    transitionBgProps: BlurParams
    transitionWindow: TransitionFn
    transitionWindowProps: BlurParams
    disableFocusTrap: boolean
    isTabbable: boolean
    unstyled: boolean
  }

  export type Callback = () => void

  export interface Callbacks {
    onOpen: Callback
    onOpened: Callback
    onClose: Callback
    onClosed: Callback
  }

  export type Open = (
    NewComponent: Component,
    newProps?: Record<string, unknown>,
    options?: Partial<Options>,
    callbacks?: Partial<Callbacks>
  ) => void

  export type Close = (callback?: Partial<Callbacks>) => void

  export interface Context {
    open: Open
    close: Close
  }

  export interface ModalProps {
    /**
     * A function to determine if an HTML element is tabbable
     * @default undefined
     */
    isTabbable?: (node: Element) => boolean

    /**
     * Svelte component to be shown as the modal
     * @default null
     */
    show?: Component | null

    /**
     * Element ID assigned to the modal's root DOM element
     * @default null
     */
    id?: string | null

    /**
     * Svelte context key to reference the simple modal context
     * @default 'simple-modal'
     */
    key?: string

    /**
     * Accessibility label of the modal
     * @see https://www.w3.org/TR/wai-aria-1.1/#aria-label
     * @default null
     */
    ariaLabel?: string | null

    /**
     * Element ID holding the accessibility label of the modal
     * @see https://www.w3.org/TR/wai-aria-1.1/#aria-labelledby
     * @default null
     */
    ariaLabelledBy?: string | null

    /**
     * Whether to show a close button or not
     * @default true
     */
    closeButton?: Component | boolean

    /**
     * Whether to close the modal on hitting the escape key or not
     * @default true
     */
    closeOnEsc?: boolean

    /**
     * Whether to close the modal upon an outside mouse click or not
     * @default true
     */
    closeOnOuterClick?: boolean

    /**
     * CSS for styling the background element
     * @default {}
     */
    styleBg?: Styles

    /**
     * CSS for styling the window wrapper element
     * @default {}
     */
    styleWindowWrap?: Styles

    /**
     * CSS for styling the window element
     * @default {}
     */
    styleWindow?: Styles

    /**
     * CSS for styling the content element
     * @default {}
     */
    styleContent?: Styles

    /**
     * CSS for styling the close element
     * @default {}
     */
    styleCloseButton?: Styles

    /**
     * Class name for the background element
     * @default null
     */
    classBg?: string | null

    /**
     * Class name for window wrapper element
     * @default null
     */
    classWindowWrap?: string | null

    /**
     * Class name for window element
     * @default null
     */
    classWindow?: string | null

    /**
     * Class name for content element
     * @default null
     */
    classContent?: string | null

    /**
     * Class name for close element
     * @default null
     */
    classCloseButton?: string | null

    /**
     * Do not apply default styles to the modal
     * @default false
     */
    unstyled?: boolean

    /**
     * The setContext() function associated with this library
     * @description If you want to bundle simple-modal with its own version of
     * Svelte you have to pass `setContext()` from your main app to simple-modal
     * using this parameter
     * @see https://svelte.dev/docs#run-time-svelte-setcontext
     * @default undefined
     */
    setContext?: <T>(key: unknown, context: T) => T

    /**
     * Transition function for the background element
     * @see https://svelte.dev/docs#transition_fn
     * @default undefined
     */
    transitionBg?: TransitionFn

    /**
     * Parameters for the background element transition
     * @default { duration: 250 }
     */
    transitionBgProps?: BlurParams | FadeParams | FlyParams | SlideParams

    /**
     * Transition function for the window element
     * @see https://svelte.dev/docs#transition_fn
     * @default undefined
     */
    transitionWindow?: TransitionFn

    /**
     * Parameters for the window element transition
     * @default undefined
     */
    transitionWindowProps?: BlurParams | FadeParams | FlyParams | SlideParams

    /**
     * If `true` elements outside the modal can be focused
     * @default false
     */
    disableFocusTrap?: boolean
  }

  export default class Modal extends SvelteComponent<
    ModalProps,
    {
      open: CustomEvent<void>
      opening: CustomEvent<void>
      close: CustomEvent<void>
      closing: CustomEvent<void>
      opened: CustomEvent<void>
      closed: CustomEvent<void>
    },
    { default: Record<string, unknown> }
  > {}
}
