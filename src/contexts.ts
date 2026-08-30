import type { HeadManager, Page } from '@inertiajs/core'
import { createContext } from 'solid-js'

export type PageRuntime = {
  page: Page
}

export const PageContext = createContext<PageRuntime>()
export const HeadContext = createContext<HeadManager>()
