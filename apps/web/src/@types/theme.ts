// Re-export shared reading types (source of truth: @mangafire/shared)
export type { PageType, FitType, ReadDirectionType, ProgressOffsetType } from '@mangafire/shared'

// FE-only types
export type LayoutType = 'default' | 'read'
export type SubPanelType = 'chapter' | 'page' | 'comment' | null
