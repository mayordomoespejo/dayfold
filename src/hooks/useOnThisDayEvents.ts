import { useQuery } from '@tanstack/react-query'
import { useContentLang } from '@/context/ContentLangContext'
import { fetchOnThisDayEvents } from '@/services/wikimediaClient'

/**
 * Fetches and caches historical events for a specific calendar day.
 * Re-fetches automatically when the content language changes.
 */
export function useOnThisDayEvents(month: number, day: number) {
  const { contentLang } = useContentLang()

  return useQuery({
    queryKey: ['on-this-day-events', contentLang, month, day],
    queryFn: ({ signal }) => fetchOnThisDayEvents({ month, day, lang: contentLang, signal }),
  })
}
