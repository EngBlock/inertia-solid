import { router, type PollOptions, type ReloadOptions } from '@inertiajs/core'
import { createSignal, onCleanup, type Accessor } from 'solid-js'

export default function usePoll(
  interval: number,
  requestOptions: ReloadOptions | (() => ReloadOptions) = {},
  options: PollOptions = { keepAlive: false, autoStart: true },
): { start: () => void; stop: () => void; polling: Accessor<boolean> } {
  const poll = router.poll(interval, requestOptions, { ...options, autoStart: options.autoStart ?? true })
  const [polling, setPolling] = createSignal(options.autoStart ?? true)

  onCleanup(() => poll.destroy())

  return {
    polling,
    stop() {
      poll.stop()
      setPolling(false)
    },
    start() {
      poll.start()
      setPolling(true)
    },
  }
}
