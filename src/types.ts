import type { LayoutCallbackReturn, PageHandler, PageProps, SharedPageProps } from '@inertiajs/core'
import type { Component, Element } from 'solid-js'

export type LayoutComponent = Component<any & { children?: Element }>
export type LayoutFunction = (page: Element) => Element
export type LayoutCallback = (props: SharedPageProps) => LayoutCallbackReturn<LayoutComponent>
export type LayoutDefinition = LayoutCallbackReturn<LayoutComponent> | LayoutFunction | LayoutCallback

export type SolidComponent = Component<any> & {
  layout?: LayoutDefinition
}

export type SolidPageHandlerArgs = Parameters<PageHandler<SolidComponent>>[0]
export type SolidInertiaAppConfig = Record<string, never>
export type ResolvedComponent<TProps extends PageProps = PageProps> = Component<TProps> & SolidComponent
