import { AI_CONFIG } from './config'

export type AiEnabled = typeof AI_CONFIG.enabled

export type AiDisabledReason = 'disabled_by_config'

export type AiStubResult<T> = {
	enabled: false
	reason: AiDisabledReason
	value: T
}
