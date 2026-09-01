import {
  CloseButton as AlertDialogCloseButton,
  Content as AlertDialogContent,
  Description as AlertDialogDescription,
  Overlay as AlertDialogOverlay,
  Portal as AlertDialogPortal,
  Root as AlertDialogRoot,
  Title as AlertDialogTitle,
  Trigger as AlertDialogTrigger,
} from '@kobalte/core/alert-dialog'
import type { ParentProps } from 'solid-js'

type ConfirmDialogProps = ParentProps<{
  confirmLabel?: string
  description: string
  onConfirm: () => void
  title: string
  triggerClass?: string
  triggerLabel?: string
}>

export default function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <AlertDialogRoot>
      <AlertDialogTrigger class={props.triggerClass} aria-label={props.triggerLabel}>
        {props.children}
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogOverlay class="modal-backdrop confirmation-backdrop" />
        <AlertDialogContent class="confirmation-dialog">
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
          <div class="confirmation-actions">
            <AlertDialogCloseButton class="secondary-button" aria-label="Cancel">
              Cancel
            </AlertDialogCloseButton>
            <AlertDialogCloseButton
              class="danger-button"
              aria-label={props.confirmLabel ?? 'Delete'}
              onClick={props.onConfirm}
            >
              {props.confirmLabel ?? 'Delete'}
            </AlertDialogCloseButton>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  )
}
