'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, ExternalLink, Plus, Check, Loader2, BookOpen, AlertCircle, Lightbulb, Scale, Building2, Award } from 'lucide-react'
import { MotionCaseCitation } from '@/lib/supabase/caseStorage'
import { debounce } from '@/lib/utils/debounce'

interface CaseLawSearchProps {
  onSelectCitation: (citation: MotionCaseCitation) => void
  selectedCitations: MotionCaseCitation[]
  motionType?: string
  legalIssues?: string
}

interface SearchResult {
  id: string
  caseName: string
  citation: string
  year: number | null
  court: string
  courtType?: 'state' | 'federal'
  snippet: string
  url: string
  dateDecided: string | null
  courtListenerId: string
  citeCount?: number
}

interface SearchResponse {
  cases: SearchResult[]
  count: number
  next: boolean
  previous: boolean
  page: number
  totalPages: number
}

type CourtFilter = 'state' | 'federal' | 'all'
type SortOption = 'relevance' | 'citeCount'

// Smart search query templates for each motion type
const buildSmartQuery = (motionType: string, legalIssues: string): string => {
  const issues = legalIssues.toLowerCase()
  
  switch (motionType) {
    case 'demurrer':
      if (issues.includes('insufficient') || issues.includes('facts') || issues.includes('fail to state')) {
        return 'demurrer "failure to state" OR "insufficient facts" OR "does not state cause of action"'
      }
      if (issues.includes('uncertain') || issues.includes('ambiguous')) {
        return 'demurrer uncertain ambiguous unintelligible CCP 430.10'
      }
      if (issues.includes('bar') || issues.includes('statute of limitations')) {
        return 'demurrer "statute of limitations" "barred by" "time-barred"'
      }
      return `demurrer California ${extractKeywords(legalIssues)}`

    case 'motion-to-compel-discovery':
      if (issues.includes('interrogator')) {
        return 'motion compel interrogatories "fail to respond" OR "inadequate response" sanctions'
      }
      if (issues.includes('document') || issues.includes('production')) {
        return 'motion compel "document production" OR "request for production" "fail to produce"'
      }
      if (issues.includes('admission')) {
        return 'motion compel "request for admission" "deemed admitted"'
      }
      if (issues.includes('meet and confer')) {
        return '"meet and confer" discovery "good faith" CCP 2016.040'
      }
      return `motion compel discovery California ${extractKeywords(legalIssues)}`

    case 'motion-to-compel-deposition':
      return `motion compel deposition "fail to appear" OR "failure to attend" sanctions ${extractKeywords(legalIssues)}`

    case 'motion-to-strike':
      if (issues.includes('punitive') || issues.includes('damages')) {
        return 'motion strike "punitive damages" malice oppression fraud'
      }
      if (issues.includes('irrelevant') || issues.includes('immaterial')) {
        return 'motion strike irrelevant immaterial improper CCP 436'
      }
      return `motion strike California ${extractKeywords(legalIssues)}`

    case 'motion-for-summary-judgment':
      if (issues.includes('triable') || issues.includes('material fact')) {
        return 'summary judgment "triable issue" "material fact" "undisputed"'
      }
      if (issues.includes('burden')) {
        return 'summary judgment "burden of proof" "shifting burden" Aguilar'
      }
      return `summary judgment California ${extractKeywords(legalIssues)}`

    case 'motion-for-summary-adjudication':
      return `summary adjudication "cause of action" OR "affirmative defense" "triable issue" ${extractKeywords(legalIssues)}`

    case 'motion-in-limine':
      if (issues.includes('prejudic') || issues.includes('352')) {
        return 'motion limine "undue prejudice" "probative value" Evidence Code 352'
      }
      if (issues.includes('hearsay')) {
        return 'motion limine hearsay exclude inadmissible'
      }
      if (issues.includes('expert') || issues.includes('opinion')) {
        return 'motion limine "expert testimony" "foundation" "qualified"'
      }
      return `motion limine exclude evidence California ${extractKeywords(legalIssues)}`

    case 'motion-for-protective-order':
      return `protective order discovery "burden" OR "harassment" OR "privacy" ${extractKeywords(legalIssues)}`

    case 'motion-to-quash-subpoena':
      return `quash subpoena "unduly burdensome" OR "oppressive" OR "privacy" ${extractKeywords(legalIssues)}`

    case 'motion-for-sanctions':
      if (issues.includes('discovery')) {
        return 'sanctions "discovery abuse" CCP 2023.030 "misuse of discovery"'
      }
      if (issues.includes('frivolous') || issues.includes('bad faith')) {
        return 'sanctions "frivolous" OR "bad faith" CCP 128.5 OR 128.7'
      }
      return `sanctions California ${extractKeywords(legalIssues)}`

    case 'ex-parte-application':
      return `"ex parte" "irreparable harm" OR "immediate danger" "notice" ${extractKeywords(legalIssues)}`

    case 'opposition':
    case 'reply':
      return extractKeywords(legalIssues) || 'California civil procedure'

    default:
      return extractKeywords(legalIssues) || 'California civil procedure'
  }
}

// Extract important keywords from legal issues text
const extractKeywords = (text: string): string => {
  if (!text) return ''
  
  // Remove common words and keep legal terms
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'any', 'our', 'my', 'your', 'his', 'her', 'its', 'their']
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 6) // Take first 6 meaningful words
  
  return words.join(' ')
}

// Suggested searches for each motion type
const getSuggestedSearches = (motionType: string): { label: string; query: string }[] => {
  switch (motionType) {
    case 'demurrer':
      return [
        { label: 'Insufficient Facts', query: 'demurrer "failure to state facts" "cause of action"' },
        { label: 'Uncertainty', query: 'demurrer uncertain ambiguous CCP 430.10' },
        { label: 'Statute of Limitations', query: 'demurrer "statute of limitations" "time-barred"' },
        { label: 'Leave to Amend', query: 'demurrer "leave to amend" "reasonable possibility"' },
      ]
    case 'motion-to-compel-discovery':
      return [
        { label: 'Interrogatories', query: 'motion compel interrogatories "fail to respond"' },
        { label: 'Document Production', query: 'motion compel "document production" "fail to produce"' },
        { label: 'Meet and Confer', query: '"meet and confer" discovery "good faith" requirement' },
        { label: 'Discovery Sanctions', query: 'discovery sanctions "misuse" CCP 2023' },
      ]
    case 'motion-to-compel-deposition':
      return [
        { label: 'Failure to Appear', query: 'deposition "fail to appear" sanctions' },
        { label: 'Document Production', query: 'deposition "document production" "business records"' },
        { label: 'Protective Order', query: 'deposition "protective order" "harassment"' },
      ]
    case 'motion-to-strike':
      return [
        { label: 'Punitive Damages', query: 'motion strike "punitive damages" malice fraud' },
        { label: 'Irrelevant Matter', query: 'motion strike irrelevant immaterial CCP 436' },
        { label: 'Anti-SLAPP', query: 'anti-SLAPP "protected activity" "probability of prevailing"' },
      ]
    case 'motion-for-summary-judgment':
      return [
        { label: 'Triable Issue', query: 'summary judgment "triable issue" "material fact"' },
        { label: 'Burden of Proof', query: 'summary judgment "burden" "shifting" Aguilar' },
        { label: 'Opposition Evidence', query: 'summary judgment opposition "disputed facts"' },
        { label: 'Separate Statement', query: 'summary judgment "separate statement" "undisputed facts"' },
      ]
    case 'motion-for-summary-adjudication':
      return [
        { label: 'Cause of Action', query: 'summary adjudication "cause of action" "no merit"' },
        { label: 'Affirmative Defense', query: 'summary adjudication "affirmative defense"' },
        { label: 'Duty Element', query: 'summary adjudication duty "no duty" element' },
      ]
    case 'motion-in-limine':
      return [
        { label: 'Prejudicial Evidence', query: 'motion limine "undue prejudice" Evidence Code 352' },
        { label: 'Hearsay', query: 'motion limine hearsay exclude inadmissible' },
        { label: 'Expert Testimony', query: 'motion limine "expert testimony" foundation qualified' },
        { label: 'Prior Bad Acts', query: 'motion limine "prior bad acts" character evidence' },
      ]
    case 'motion-for-protective-order':
      return [
        { label: 'Privacy', query: 'protective order discovery privacy "constitutional right"' },
        { label: 'Burden', query: 'protective order "unduly burdensome" "oppressive"' },
        { label: 'Trade Secrets', query: 'protective order "trade secret" confidential' },
      ]
    case 'motion-to-quash-subpoena':
      return [
        { label: 'Consumer Records', query: 'quash subpoena "consumer records" notice privacy' },
        { label: 'Burden', query: 'quash subpoena "unduly burdensome" scope' },
        { label: 'Relevance', query: 'quash subpoena relevance "not reasonably calculated"' },
      ]
    case 'motion-for-sanctions':
      return [
        { label: 'Discovery Abuse', query: 'sanctions "discovery abuse" "misuse" CCP 2023' },
        { label: 'Frivolous Filing', query: 'sanctions frivolous "bad faith" CCP 128.5' },
        { label: 'Monetary Sanctions', query: 'sanctions "reasonable expenses" "attorney fees"' },
      ]
    case 'ex-parte-application':
      return [
        { label: 'Irreparable Harm', query: '"ex parte" "irreparable harm" "immediate"' },
        { label: 'Notice Requirements', query: '"ex parte" notice "reasonable effort"' },
        { label: 'TRO Standards', query: '"temporary restraining order" "likelihood of success"' },
      ]
    default:
      return [
        { label: 'California Procedure', query: 'California civil procedure' },
        { label: 'Motion Practice', query: 'California motion practice standards' },
      ]
  }
}

export default function CaseLawSearch({ 
  onSelectCitation, 
  selectedCitations,
  motionType,
  legalIssues 
}: CaseLawSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  
  // Filter and sort options
  const [courtFilter, setCourtFilter] = useState<CourtFilter>('state')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')

  const performSearch = async (searchQuery: string, searchPage: number = 1, court: CourtFilter = courtFilter, sort: SortOption = sortBy) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch('/api/courtlistener/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          court: court,
          page: searchPage,
          pageSize: 10,
          sortBy: sort,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Search failed')
      }

      const data: SearchResponse = await response.json()
      setResults(data.cases)
      setPage(data.page)
      setTotalPages(data.totalPages)
      setTotalCount(data.count)
    } catch (err) {
      console.error('Case law search error:', err)
      setError(err instanceof Error ? err.message : 'Failed to search case law')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-search when component mounts with context
  useEffect(() => {
    if (motionType && legalIssues && !hasAutoSearched) {
      const smartQuery = buildSmartQuery(motionType, legalIssues)
      setQuery(smartQuery)
      performSearch(smartQuery)
      setHasAutoSearched(true)
    }
  }, [motionType, legalIssues, hasAutoSearched])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((q: string) => performSearch(q, 1), 500),
    [courtFilter, sortBy]
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)
    debouncedSearch(value)
  }

  const handleSuggestionClick = (suggestionQuery: string) => {
    setQuery(suggestionQuery)
    performSearch(suggestionQuery)
  }

  const handleCourtFilterChange = (newFilter: CourtFilter) => {
    setCourtFilter(newFilter)
    if (query) {
      performSearch(query, 1, newFilter, sortBy)
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    if (query) {
      performSearch(query, 1, courtFilter, newSort)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      performSearch(query, newPage)
    }
  }

  const handleSelectCase = (result: SearchResult) => {
    const citation: MotionCaseCitation = {
      id: result.courtListenerId || result.id,
      caseName: result.caseName,
      citation: result.citation,
      year: result.year || undefined,
      court: result.court,
      relevantText: result.snippet,
      courtListenerId: result.courtListenerId,
      url: result.url,
    }
    onSelectCitation(citation)
  }

  const isSelected = (id: string) => selectedCitations.some(c => c.id === id)

  const suggestedSearches = motionType ? getSuggestedSearches(motionType) : []

  return (
    <div className="space-y-4">
      {/* Context Info */}
      {motionType && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-blue-700">
            Showing relevant cases for <strong>{motionType.replace(/-/g, ' ')}</strong>
            {legalIssues && <span className="text-blue-500"> based on your legal issues</span>}
          </span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
        {/* Court Filter */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Courts:</span>
          <div className="flex gap-1">
            {[
              { value: 'state', label: 'CA State', icon: Scale },
              { value: 'federal', label: 'Federal', icon: Building2 },
              { value: 'all', label: 'All', icon: null },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleCourtFilterChange(value as CourtFilter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  courtFilter === value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Option */}
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Sort:</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleSortChange('relevance')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortBy === 'relevance'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Relevance
            </button>
            <button
              onClick={() => handleSortChange('citeCount')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortBy === 'citeCount'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Most Cited
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Searches */}
      {suggestedSearches.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested Searches:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedSearches.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion.query)}
                className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-full border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-colors"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search California case law (e.g., 'summary judgment burden of proof')"
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white text-gray-900 placeholder-gray-400"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin" />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && !isSearching && results.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No cases found matching your search.</p>
          <p className="text-sm mt-1">Try different keywords or change your court filter.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Found {totalCount.toLocaleString()} cases</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          {results.map((result) => (
            <div
              key={result.id}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isSelected(result.courtListenerId || result.id)
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 line-clamp-2">
                    {result.caseName}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-medium text-purple-600">{result.citation}</span>
                    {result.year && (
                      <span className="text-xs text-gray-500">({result.year})</span>
                    )}
                    {result.citeCount !== undefined && result.citeCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        <Award className="w-3 h-3" />
                        {result.citeCount} citations
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{result.court}</span>
                    {result.courtType && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        result.courtType === 'federal' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {result.courtType === 'federal' ? 'Federal' : 'State'}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 mb-1">Relevant Excerpt:</div>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-5">{result.snippet}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleSelectCase(result)}
                    disabled={isSelected(result.courtListenerId || result.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected(result.courtListenerId || result.id)
                        ? 'bg-purple-100 text-purple-600 cursor-default'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isSelected(result.courtListenerId || result.id) ? (
                      <>
                        <Check className="w-4 h-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add
                      </>
                    )}
                  </button>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isSearching}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isSearching}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || isSearching}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Court Info */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="font-medium mb-1">Available Courts:</div>
        <div className="grid grid-cols-2 gap-1">
          <div><span className="text-green-600">●</span> CA Supreme Court</div>
          <div><span className="text-green-600">●</span> CA Court of Appeal</div>
          <div><span className="text-blue-600">●</span> 9th Circuit Court of Appeals</div>
          <div><span className="text-blue-600">●</span> CA Federal District Courts</div>
        </div>
        <div className="mt-2 text-gray-400 text-[10px]">
          Note: CA Superior Court (trial court) opinions are not published and not publicly available.
        </div>
      </div>

      {/* CourtListener Attribution */}
      <div className="text-center text-xs text-gray-400 pt-2">
        Powered by{' '}
        <a
          href="https://www.courtlistener.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-500 hover:underline"
        >
          CourtListener
        </a>{' '}
        - Free Law Project (includes Harvard Caselaw Access Project data)
      </div>
    </div>
  )
}
