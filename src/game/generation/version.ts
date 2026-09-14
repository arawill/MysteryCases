export const PROCEDURAL_GENERATION_VERSION = 7
export const getVersionedProceduralCaseId = (baseId: string) => `${baseId}-g${PROCEDURAL_GENERATION_VERSION}`
