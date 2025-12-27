import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface OpinionDetail {
  id: number
  absolute_url?: string
  cluster?: {
    case_name?: string
    date_filed?: string
    docket?: {
      court?: {
        full_name?: string
        short_name?: string
      }
    }
    citations?: Array<{
      volume?: number
      reporter?: string
      page?: string
    }>
    syllabus?: string
    judges?: string
    attorneys?: string
  }
  author?: {
    name_full?: string
  }
  plain_text?: string
  html?: string
  html_with_citations?: string
  type?: string
  per_curiam?: boolean
  sha1?: string
  download_url?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('[CourtListener Opinion] User not authenticated')
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Opinion ID is required' }, { status: 400 })
    }

    const apiKey = process.env.COURTLISTENER_API_KEY
    
    // Fetch opinion details from CourtListener API v4
    const opinionUrl = `https://www.courtlistener.com/api/rest/v4/opinions/${id}/`
    
    console.log(`[AUDIT] CourtListener opinion fetch by user ${user.id}: ${id}`)
    console.log(`[CourtListener Opinion] Request URL: ${opinionUrl}`)

    const headers: Record<string, string> = {
      'User-Agent': 'SkepticalAttorney/1.0 (Legal Practice Automation)',
      'Accept': 'application/json',
    }
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Token ${apiKey.trim()}`
    }

    const response = await fetch(opinionUrl, {
      method: 'GET',
      headers,
    })

    console.log(`[CourtListener Opinion] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[CourtListener Opinion] API error:', response.status, errorText)
      
      if (response.status === 404) {
        return NextResponse.json({ error: 'Opinion not found' }, { status: 404 })
      }
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ 
          error: 'CourtListener access denied',
          details: 'API authentication failed'
        }, { status: response.status })
      }
      if (response.status === 429) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch opinion', details: errorText },
        { status: response.status }
      )
    }

    const data: OpinionDetail = await response.json()
    
    // Transform to our format
    const opinion = {
      id: String(data.id),
      caseName: data.cluster?.case_name || 'Unknown Case',
      dateFiled: data.cluster?.date_filed || null,
      court: data.cluster?.docket?.court?.full_name || data.cluster?.docket?.court?.short_name || 'Unknown Court',
      citation: formatCitation(data.cluster?.citations),
      judges: data.cluster?.judges || data.author?.name_full || null,
      attorneys: data.cluster?.attorneys || null,
      syllabus: data.cluster?.syllabus || null,
      text: data.plain_text || null,
      html: data.html_with_citations || data.html || null,
      url: data.absolute_url 
        ? `https://www.courtlistener.com${data.absolute_url}` 
        : `https://www.courtlistener.com/opinion/${data.id}/`,
      downloadUrl: data.download_url || null,
      opinionType: data.type || null,
      perCuriam: data.per_curiam || false,
    }

    return NextResponse.json(opinion)

  } catch (error) {
    console.error('CourtListener opinion fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatCitation(citations?: Array<{ volume?: number; reporter?: string; page?: string }>): string {
  if (!citations || citations.length === 0) {
    return 'Citation unavailable'
  }
  
  const cite = citations[0]
  const parts = []
  if (cite.volume) parts.push(String(cite.volume))
  if (cite.reporter) parts.push(cite.reporter)
  if (cite.page) parts.push(String(cite.page))
  
  return parts.length > 0 ? parts.join(' ') : 'Citation unavailable'
}



