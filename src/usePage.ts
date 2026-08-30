import type { Page, PageProps, SharedPageProps } from '@inertiajs/core'
import { useContext } from 'solid-js'
import { PageContext } from './contexts'

export default function usePage<TPageProps extends PageProps = PageProps>(): Page<TPageProps & SharedPageProps> {
  return useContext(PageContext).page as Page<TPageProps & SharedPageProps>
}
