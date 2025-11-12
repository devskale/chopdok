// api.ts
import { Criterion, Source } from './store'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const api = {
  fetchCriteria: async (project: string): Promise<Criterion[]> => {
    await delay(500)
    const storedCriteria = localStorage.getItem(`criteria-storage-${project}`)
    return storedCriteria ? JSON.parse(storedCriteria) : []
  },

  saveCriteria: async (project: string, criteria: Criterion[]): Promise<void> => {
    await delay(500)
    localStorage.setItem(`criteria-storage-${project}`, JSON.stringify(criteria))
  },

  fetchSources: async (project: string): Promise<Source[]> => {
    await delay(500)
    const storedSources = localStorage.getItem(`sources-storage-${project}`)
    return storedSources ? JSON.parse(storedSources) : []
  },

  saveSources: async (project: string, sources: Source[]): Promise<void> => {
    await delay(500)
    localStorage.setItem(`sources-storage-${project}`, JSON.stringify(sources))
  },
}