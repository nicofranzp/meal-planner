import type { AiStubResult } from '../types'

export function aiDisabled<T>(value: T): AiStubResult<T> {
	return {
		enabled: false,
		reason: 'disabled_by_config',
		value
	}
}
