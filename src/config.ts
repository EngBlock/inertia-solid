import { config as coreConfig } from '@inertiajs/core'
import type { SolidInertiaAppConfig } from './types'

export const config = coreConfig.extend<SolidInertiaAppConfig>({})
