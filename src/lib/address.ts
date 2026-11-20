import type { Address } from './types'

/**
 * Autocomplétion d'adresse via la Base Adresse Nationale (service public gratuit),
 * hébergée par l'IGN sur la Géoplateforme.
 */
const ENDPOINT = 'https://data.geopf.fr/geocodage/search'

interface Feature {
  properties?: { label?: string; name?: string; postcode?: string; city?: string }
  geometry?: { coordinates?: [number, number] }
}

export function parseAddressFeatures(json: unknown): Address[] {
  const features = (json as { features?: Feature[] })?.features ?? []
  return features
    .filter((f) => f.properties?.label)
    .map((f) => {
      const [lng, lat] = f.geometry?.coordinates ?? []
      return {
        label: f.properties!.label!,
        street: f.properties!.name,
        postcode: f.properties!.postcode,
        city: f.properties!.city,
        lat: typeof lat === 'number' ? lat : undefined,
        lng: typeof lng === 'number' ? lng : undefined,
      }
    })
}

export async function searchAddress(query: string, signal?: AbortSignal): Promise<Address[]> {
  const q = query.trim()
  if (q.length < 4) return []
  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=5&index=address&autocomplete=1`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    return parseAddressFeatures(await res.json())
  } catch {
    return [] // hors ligne ou service indisponible : saisie libre
  }
}
