export const PROCEDURAL_GENERATION_VERSION = 3
export const getVersionedProceduralCaseId = (baseId: string) => `${baseId}-g${PROCEDURAL_GENERATION_VERSION}`
