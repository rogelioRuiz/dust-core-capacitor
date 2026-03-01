import { registerPlugin, WebPlugin } from '@capacitor/core'

import type { CorePlugin } from './definitions'

export const DUST_CORE_VERSION = '0.1.0'

class CoreWeb extends WebPlugin implements CorePlugin {
  async getContractVersion(): Promise<{ version: string }> {
    return { version: DUST_CORE_VERSION }
  }
}

export const Core = registerPlugin<CorePlugin>('Core', {
  web: () => Promise.resolve(new CoreWeb()),
})
