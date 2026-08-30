import type { LayoutCallbackReturn, PageHandler, PageProps, SharedPageProps } from '@inertiajs/core'
import type { Component, Element } from 'solid-js'

export type SolidComponent = Component<any> & {
  layout?: LayoutComponent | LayoutComponent[] | LayoutFunction | LayoutCallback
}

export type LayoutComponent = Component<any & { children?: Element }>
export type LayoutFunction = (page: Element) => Element
export type LayoutCallback = (props: SharedPageProps) => LayoutCallbackReturn<LayoutComponent>
export type SolidPageHandlerArgs = Parameters<PageHandler<SolidComponent>>[0]
export type SolidInertiaAppConfig = Record<string, never>
export type ResolvedComponent<TProps extends PageProps = PageProps> = Component<TProps> & SolidComponent
