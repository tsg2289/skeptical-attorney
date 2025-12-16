import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CourtListenerResult {
  id: number
  caseName?: string
  case_name?: string
  citation?: string[]
  dateFiled?: string
  date_filed?: string
  court?: string
  court_id?: string
  snippet?: string
  text?: string
  plain_text?: string
  absolute_url?: string
  volume?: string
  reporter?: string
  page?: string
  citeCount?: number
  cite_count?: number
  // V4 additional fields for better excerpts
  syllabus?: string      // Key holdings/summary
  posture?: string       // Procedural posture  
  judge?: string         // Judge who wrote opinion
  highlighted?: string   // Search-highlighted text
  headnotes?: string     // Legal headnotes
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated (prevents data leakage)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('[CourtListener] User not authenticated')
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      query, 
      court = 'state', // 'state', 'federal', 'all'
      page = 1, 
      pageSize = 10,
      sortBy = 'relevance' // 'relevance' or 'citeCount'
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Use server-side API key (NEVER expose to client)
    const apiKey = process.env.COURTLISTENER_API_KEY
    console.log(`[CourtListener] API Key configured: ${apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO'}`)

    // Build search URL for CourtListener API V4
    // API Docs: https://www.courtlistener.com/help/api/rest/case-law/
    const searchUrl = new URL('https://www.courtlistener.com/api/rest/v4/search/')
    searchUrl.searchParams.append('q', query)
    searchUrl.searchParams.append('type', 'o') // opinions only
    
    // Court filter options
    // California State Courts (appellate only - trial court opinions not published)
    const stateCourts = ['cal', 'calctapp']
    // Federal Courts in California (includes trial court opinions!)
    const federalCourts = ['ca9', 'cand', 'cacd', 'caed', 'casd']
    
    if (court === 'state' || court === 'california' || court === 'ca') {
      // California state appellate courts
      stateCourts.forEach(c => searchUrl.searchParams.append('court', c))
    } else if (court === 'federal') {
      // Federal courts covering California
      federalCourts.forEach(c => searchUrl.searchParams.append('court', c))
    } else if (court === 'all') {
      // All California-related courts
      [...stateCourts, ...federalCourts].forEach(c => searchUrl.searchParams.append('court', c))
    } else if (court) {
      // Custom court filter
      searchUrl.searchParams.append('court', court)
    }
    
    // Sort options
    if (sortBy === 'citeCount') {
      searchUrl.searchParams.append('order_by', 'citeCount desc')
    } else {
      searchUrl.searchParams.append('order_by', 'score desc')
    }
    
    searchUrl.searchParams.append('page', String(page))
    searchUrl.searchParams.append('page_size', String(pageSize))

    console.log(`[AUDIT] CourtListener search by user ${user.id}: "${query}" (court: ${court}, sort: ${sortBy})`)
    console.log(`[CourtListener] Request URL: ${searchUrl.toString()}`)

    // Build headers - CourtListener API works without auth for basic searches
    // but with auth you get higher rate limits
    const headers: Record<string, string> = {
      'User-Agent': 'SkepticalAttorney/1.0 (Legal Practice Automation)',
      'Accept': 'application/json',
    }
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Token ${apiKey.trim()}`
    }

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers,
    })

    console.log(`[CourtListener] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[CourtListener] API error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid CourtListener API key' }, { status: 401 })
      }
      if (response.status === 403) {
        // Try without auth header as fallback
        console.log('[CourtListener] 403 received, trying without auth...')
        const retryResponse = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'SkepticalAttorney/1.0 (Legal Practice Automation)',
            'Accept': 'application/json',
          }
        })
        
        if (retryResponse.ok) {
          const data = await retryResponse.json()
          return processCourtListenerResponse(data, page, pageSize)
        }
        
        return NextResponse.json({ 
          error: 'CourtListener access denied. The API key may be invalid or the service may be temporarily unavailable.',
          details: errorText
        }, { status: 403 })
      }
      if (response.status === 429) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 })
      }
      
      return NextResponse.json(
        { error: 'Failed to search case law', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`[CourtListener] Response structure: ${JSON.stringify(Object.keys(data))}`)
    if (data.results?.[0]) {
      console.log(`[CourtListener] First result fields: ${JSON.stringify(Object.keys(data.results[0]))}`)
    }
    return processCourtListenerResponse(data, page, pageSize)

  } catch (error) {
    console.error('CourtListener search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to process CourtListener response
function processCourtListenerResponse(data: any, page: number, pageSize: number) {
  // Transform results to our format
  const cases = data.results?.map((result: CourtListenerResult) => ({
    id: String(result.id),
    caseName: result.caseName || result.case_name || 'Unknown Case',
    citation: formatCitation(result),
    year: result.dateFiled || result.date_filed 
      ? new Date(result.dateFiled || result.date_filed || '').getFullYear() 
      : null,
    court: mapCourtName(result.court || result.court_id || 'California'),
    courtType: getCourtType(result.court || result.court_id || ''),
    snippet: cleanSnippet(
      result.snippet || 
      result.highlighted ||
      result.syllabus ||
      result.headnotes ||
      result.text?.substring(0, 600) || 
      result.plain_text?.substring(0, 600) ||
      'No excerpt available'
    ),
    url: result.absolute_url 
      ? `https://www.courtlistener.com${result.absolute_url}` 
      : `https://www.courtlistener.com/opinion/${result.id}/`,
    dateDecided: result.dateFiled || result.date_filed || null,
    courtListenerId: String(result.id),
    citeCount: result.citeCount || result.cite_count || 0,
  })) || []

  console.log(`[CourtListener] Found ${cases.length} results`)

  return NextResponse.json({
    cases,
    count: data.count || cases.length,
    next: data.next ? true : false,
    previous: data.previous ? true : false,
    page,
    totalPages: Math.ceil((data.count || 0) / pageSize),
  })
}

function formatCitation(result: CourtListenerResult): string {
  // If citation array exists, use first one
  if (result.citation && Array.isArray(result.citation) && result.citation.length > 0) {
    return result.citation[0]
  }
  
  // Build citation from parts
  const parts = []
  if (result.volume) parts.push(result.volume)
  if (result.reporter) parts.push(result.reporter)
  if (result.page) parts.push(result.page)
  
  if (parts.length > 0) {
    return parts.join(' ')
  }
  
  return 'Citation unavailable'
}

function mapCourtName(courtId: string): string {
  const courtMap: Record<string, string> = {
    'cal': 'California Supreme Court',
    'calctapp': 'California Court of Appeal',
    'cacd': 'U.S. District Court, C.D. California',
    'caed': 'U.S. District Court, E.D. California',
    'cand': 'U.S. District Court, N.D. California',
    'casd': 'U.S. District Court, S.D. California',
    'ca9': 'U.S. Court of Appeals, Ninth Circuit',
  }
  return courtMap[courtId.toLowerCase()] || courtId
}

function getCourtType(courtId: string): 'state' | 'federal' {
  const federalCourts = ['ca9', 'cand', 'cacd', 'caed', 'casd']
  return federalCourts.includes(courtId.toLowerCase()) ? 'federal' : 'state'
}

function cleanSnippet(snippet: string): string {
  // Remove HTML tags and clean up snippet
  return snippet
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }
  
  // Convert to POST request internally
  const fakeRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      query,
      court: searchParams.get('court') || 'state',
      page: parseInt(searchParams.get('page') || '1'),
      sortBy: searchParams.get('sortBy') || 'relevance',
    }),
  })
  
  return POST(fakeRequest)
}
