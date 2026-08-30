import {
  createForm,
  type FormComponentRef,
  type FormComponentSlotProps,
  type FormProps,
  useForm,
  useFormContext,
} from '@engblock/inertia-solid'

type ProfileForm = {
  profile: {
    name: string
  }
  tags: string[]
}

const ProfileFormComponent = createForm<ProfileForm>()
const formProps: FormProps<ProfileForm> = {
  action: '/profiles',
  method: 'post',
  transform: (data) => ({ ...data, tags: data.tags.filter(Boolean) }),
  resetOnSuccess: ['profile.name'],
  validationTimeout: 250,
  validateFiles: true,
}

function ContextConsumer() {
  const form = useFormContext<ProfileForm>()
  if (!form) return null

  form.setError('profile.name', 'Required')
  form.reset('tags.0')

  // @ts-expect-error Unknown fields are rejected by the typed context.
  form.clearErrors('missing')

  return <p>{form.errors['profile.name']}</p>
}

export default function Types() {
  let formRef: FormComponentRef<ProfileForm> | undefined
  const helper = useForm<ProfileForm>({ profile: { name: '' }, tags: [] })

  helper.setData('profile.name', 'Ada')

  return (
    <ProfileFormComponent
      {...formProps}
      ref={(surface) => (formRef = surface)}
      onSubmitComplete={({ reset, defaults }) => {
        reset('profile.name')
        defaults()
      }}
    >
      {(form: FormComponentSlotProps<ProfileForm>) => {
        form.setError('tags.0', 'Invalid tag')
        form.validate('profile.name').touch('tags.0')
        const validating: boolean = form.validating
        void validating
        formRef?.getData().profile.name

        // @ts-expect-error The typed factory preserves field names in render callbacks.
        form.reset('unknown')

        return <ContextConsumer />
      }}
    </ProfileFormComponent>
  )
}
