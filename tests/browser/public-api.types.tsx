import {
  App,
  Deferred,
  Form,
  Head,
  InfiniteScroll,
  Link,
  WhenVisible,
  config,
  createForm,
  createInertiaApp,
  http,
  progress,
  resetLayoutProps,
  router,
  setLayoutProps,
  useForm,
  useFormContext,
  useHttp,
  usePage,
  usePoll,
  usePrefetch,
  useRemember,
  type CreateSolidInertiaAppOptions,
  type DeferredProps,
  type DeferredSlotProps,
  type FormComponentMethods,
  type FormComponentRef,
  type FormComponentSlotProps,
  type FormComponentState,
  type FormProps,
  type HeadProps,
  type HeadTagDescriptor,
  type HttpForm,
  type HttpPrecognitiveForm,
  type InfiniteScrollActionSlotProps,
  type InfiniteScrollElement,
  type InfiniteScrollProps,
  type InfiniteScrollRef,
  type InfiniteScrollSlotProps,
  type InertiaApp,
  type InertiaAppProps,
  type InertiaForm,
  type InertiaFormValidation,
  type InertiaLinkProps,
  type InertiaPrecognitiveForm,
  type LayoutCallback,
  type LayoutComponent,
  type LayoutDefinition,
  type LayoutFunction,
  type PrefetchState,
  type ResolvedComponent,
  type SetDataAction,
  type SetDataByKeyValuePair,
  type SetDataByMethod,
  type SetDataByObject,
  type SetupOptions,
  type SolidComponent,
  type TypedFormComponent,
  type WhenVisibleProps,
  type WhenVisibleSlotProps,
} from '@engblock/inertia-solid'
import createServer from '@engblock/inertia-solid/server'
import type { JSX } from '@solidjs/web'

const ProfileForm = createForm<{ profile: { email: string } }>()
let componentRef: FormComponentRef<{ profile: { email: string } }> | undefined

const TypedPage: SolidComponent = (props: { message?: string }) => <p>{props.message}</p>
TypedPage.layout = (props: Record<string, unknown>) => [TypedPage, { message: String(props.message ?? '') }]

const appOptions: CreateSolidInertiaAppOptions<Record<string, unknown>> = {
  resolve: () => TypedPage,
  setup: ({ App, props }) => <App {...props} />,
  withApp: (app, { ssr, page }) => (
    <section data-ssr={ssr} data-url={page.url}>
      {app}
    </section>
  ),
  render: () => '<div id="app"></div>',
}

function PublicApiFixture(): JSX.Element {
  const page = usePage<{ user: { name: string } }>()
  const visitForm = useForm({ profile: { email: '' } })
  const directForm = useHttp<{ enabled: boolean }, { saved: boolean }>({ enabled: false })
  const poll = usePoll(5_000, () => ({ only: ['user'] }))
  const prefetch: PrefetchState = usePrefetch()
  const [remembered, setRemembered] = useRemember({ query: '' }, 'public-api')
  const context = useFormContext<{ profile: { email: string } }>()

  visitForm.setData('profile.email', 'ada@example.test')
  void directForm.post('/api/settings').then((response) => response.saved)
  setRemembered((value) => ({ query: `${value.query}!` }))
  poll.stop()
  prefetch.flush()
  context?.clearErrors('profile.email')

  return (
    <>
      <Head title={page.props.user.name} tags={[{ tag: 'meta', attrs: { name: 'robots', content: 'none' } }]} />
      <Link href={{ method: 'get', url: '/users' }} prefetch="hover">
        Users
      </Link>
      <Deferred data="user" fallback={<span>Loading</span>}>
        {({ reloading }) => <span>{reloading() ? 'Refreshing' : remembered().query}</span>}
      </Deferred>
      <WhenVisible data="user" fallback={<span>Waiting</span>}>
        {({ fetching }) => <span>{fetching() ? 'Loading' : 'Loaded'}</span>}
      </WhenVisible>
      <ProfileForm action="/profiles" method="post" ref={(value) => (componentRef = value)}>
        {(form) => <button disabled={form.processing}>{form.errors['profile.email']}</button>}
      </ProfileForm>
      <InfiniteScroll data="users" manual next={(state) => <button onClick={state.fetch}>More</button>} />
    </>
  )
}

void PublicApiFixture
void appOptions
void componentRef
void createServer
void [App, Form, config, createInertiaApp, http, progress, resetLayoutProps, router, setLayoutProps]

type PublicTypeSurface =
  | CreateSolidInertiaAppOptions<Record<string, unknown>>
  | DeferredProps
  | DeferredSlotProps
  | FormComponentMethods
  | FormComponentRef
  | FormComponentSlotProps
  | FormComponentState
  | FormProps
  | HeadProps
  | HeadTagDescriptor
  | HttpForm<object>
  | HttpPrecognitiveForm<object>
  | InfiniteScrollActionSlotProps
  | InfiniteScrollElement
  | InfiniteScrollProps
  | InfiniteScrollRef
  | InfiniteScrollSlotProps
  | InertiaApp
  | InertiaAppProps
  | InertiaForm<object>
  | InertiaFormValidation<object>
  | InertiaLinkProps
  | InertiaPrecognitiveForm<object>
  | LayoutCallback
  | LayoutComponent
  | LayoutDefinition
  | LayoutFunction
  | ResolvedComponent
  | SetDataAction<object>
  | SetDataByKeyValuePair<object>
  | SetDataByMethod<object>
  | SetDataByObject<object>
  | SetupOptions<HTMLElement | null, Record<string, unknown>>
  | SolidComponent
  | TypedFormComponent<object>
  | WhenVisibleProps
  | WhenVisibleSlotProps

const publicTypesCompile: PublicTypeSurface | undefined = undefined
void publicTypesCompile
