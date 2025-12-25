'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'
import { 
  Search, BookOpen, Scale, Gavel, FileText, Clock, 
  Bookmark, History, Building2, Filter, ChevronRight,
  ExternalLink, Plus, Check, Loader2, AlertCircle, 
  Lightbulb, Award, Download, Star, X, ArrowRight
} from 'lucide-react'
import { debounce } from '@/lib/utils/debounce'

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

type CourtFilter = 'state' | 'federal' | 'all' | 'scotus' | 'ca9'
type SortOption = 'relevance' | 'citeCount' | 'date'
type SearchTab = 'cases' | 'saved'

export default function LegalResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950">
          <Header />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading legal research...</p>
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <LegalResearchContent />
    </Suspense>
  )
}

function LegalResearchContent() {
  const searchParams = useSearchParams()
  const { isTrialMode, canAccessDatabase, isTrialCaseId } = useTrialMode()
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  
  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Filter state
  const [courtFilter, setCourtFilter] = useState<CourtFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [activeTab, setActiveTab] = useState<SearchTab>('cases')
  
  // Saved items
  const [savedCases, setSavedCases] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Load case context and saved data
  useEffect(() => {
    const loadCase = async () => {
      const caseId = searchParams?.get('caseId')
      if (caseId && isTrialMode && !isTrialCaseId(caseId)) return
      
      if (caseId && !isTrialMode && canAccessDatabase()) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) setCurrentCase(foundCase)
        }
      }
    }
    loadCase()
    
    // Load saved cases from localStorage
    try {
      const saved = localStorage.getItem('legal-research-saved')
      if (saved) setSavedCases(JSON.parse(saved))
      
      const searches = localStorage.getItem('legal-research-history')
      if (searches) setRecentSearches(JSON.parse(searches))
    } catch (e) {
      console.error('Error loading saved data:', e)
    }
  }, [searchParams, isTrialMode, canAccessDatabase, isTrialCaseId])

  const performSearch = async (searchQuery: string, searchPage = 1, court: CourtFilter = courtFilter, sort: SortOption = sortBy) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setError(null)
    setHasSearched(true)
    setPage(searchPage)

    // Save to recent searches
    try {
      const updatedSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10)
      setRecentSearches(updatedSearches)
      localStorage.setItem('legal-research-history', JSON.stringify(updatedSearches))
    } catch (e) {
      console.error('Error saving search history:', e)
    }

    try {
      const response = await fetch('/api/courtlistener/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          court: court,
          page: searchPage,
          pageSize: 15,
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
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Failed to search case law')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search - use refs to avoid recreation and stale closures
  const courtFilterRef = useRef(courtFilter)
  const sortByRef = useRef(sortBy)
  
  // Keep refs in sync with state
  useEffect(() => {
    courtFilterRef.current = courtFilter
    sortByRef.current = sortBy
  }, [courtFilter, sortBy])
  
  // Create stable debounced function once
  const debouncedSearchRef = useRef(
    debounce((q: string) => {
      performSearch(q, 1, courtFilterRef.current, sortByRef.current)
    }, 600)
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (value.trim().length > 2) {
      debouncedSearchRef.current(value)
    }
  }

  const handleSaveCase = (result: SearchResult) => {
    const isAlreadySaved = savedCases.some(c => c.id === result.id)
    let updated: SearchResult[]
    
    if (isAlreadySaved) {
      updated = savedCases.filter(c => c.id !== result.id)
    } else {
      updated = [...savedCases, result]
    }
    
    setSavedCases(updated)
    try {
      localStorage.setItem('legal-research-saved', JSON.stringify(updated))
    } catch (e) {
      console.error('Error saving case:', e)
    }
  }

  const handleClearHistory = () => {
    setRecentSearches([])
    localStorage.removeItem('legal-research-history')
  }

  const handleClearSaved = () => {
    setSavedCases([])
    localStorage.removeItem('legal-research-saved')
  }

  const isSaved = (id: string) => savedCases.some(c => c.id === id)

  const handleCourtFilterChange = (newFilter: CourtFilter) => {
    setCourtFilter(newFilter)
    if (query.trim()) {
      performSearch(query, 1, newFilter, sortBy)
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    if (query.trim()) {
      performSearch(query, 1, courtFilter, newSort)
    }
  }

  // Suggested legal research queries
  const suggestedQueries = [
    { label: 'Summary Judgment Standard', query: 'summary judgment "triable issue" "material fact"' },
    { label: 'Negligence Elements', query: 'negligence duty breach causation damages California' },
    { label: 'Contract Formation', query: 'contract formation offer acceptance consideration' },
    { label: 'Due Process', query: '"due process" "procedural due process" notice hearing' },
    { label: 'Discovery Sanctions', query: 'discovery sanctions "misuse" CCP 2023' },
    { label: 'Anti-SLAPP Motion', query: 'anti-SLAPP "protected activity" "probability of prevailing"' },
    { label: 'Statute of Limitations', query: '"statute of limitations" "accrual" "discovery rule"' },
    { label: 'Breach of Contract', query: '"breach of contract" damages "consequential damages"' },
  ]

  // Practice area quick searches
  const practiceAreas = [
    { label: 'Personal Injury', icon: '⚕️', query: 'personal injury negligence "duty of care" damages' },
    { label: 'Employment', icon: '💼', query: 'wrongful termination employment discrimination FEHA' },
    { label: 'Real Estate', icon: '🏠', query: 'real property "breach of contract" "specific performance"' },
    { label: 'Business Litigation', icon: '📊', query: 'breach fiduciary duty "business judgment rule"' },
    { label: 'Family Law', icon: '👨‍👩‍👧', query: 'child custody "best interests" family code' },
    { label: 'Probate', icon: '📜', query: 'probate "undue influence" testamentary capacity' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <Header />
      <TrialModeBanner />
      
      {/* Case Context Header */}
      {currentCase && !isTrialMode && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-4 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link href={`/dashboard/cases/${currentCase.id}`} className="hover:opacity-80 transition-opacity">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                  {currentCase.caseNumber && (
                    <p className="text-sm text-indigo-200">Case #: {currentCase.caseNumber}</p>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/cases/${currentCase.id}`}
                className="text-sm hover:underline text-indigo-200"
              >
                Back to Case
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-6">
              <Scale className="w-4 h-4" />
              Powered by CourtListener
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Legal Research
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-6">
              Search millions of court opinions from California state and federal courts
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Search Section */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 mb-8 shadow-xl">
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch(query)}
              placeholder='Search case law (e.g., "negligence duty of care" OR "summary judgment standard")'
              className="w-full pl-14 pr-32 py-4 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 text-lg transition-all"
            />
            <button
              onClick={() => performSearch(query)}
              disabled={isSearching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Court Filter */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Courts:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'all', label: 'All Courts' },
                  { value: 'state', label: 'CA State' },
                  { value: 'federal', label: 'CA Federal' },
                  { value: 'ca9', label: '9th Circuit' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleCourtFilterChange(value as CourtFilter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      courtFilter === value
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Option */}
            <div className="flex items-center gap-2 ml-auto">
              <Award className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="relevance">Relevance</option>
                <option value="citeCount">Most Cited</option>
              </select>
            </div>
          </div>

          {/* Practice Areas - Quick Access */}
          {!hasSearched && (
            <div className="space-y-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quick Search by Practice Area:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {practiceAreas.map((area, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setQuery(area.query); performSearch(area.query) }}
                    className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 transition-all group"
                  >
                    <span className="text-2xl">{area.icon}</span>
                    <span className="text-xs text-slate-400 group-hover:text-indigo-300 text-center">{area.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Queries */}
          {!hasSearched && (
            <div className="space-y-3 mt-6">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Popular Legal Research Topics:</div>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setQuery(suggestion.query); performSearch(suggestion.query) }}
                    className="px-4 py-2 text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700 hover:border-indigo-500 hover:text-indigo-300 transition-all flex items-center gap-2"
                  >
                    {suggestion.label}
                    <ArrowRight className="w-3 h-3 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {!hasSearched && recentSearches.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <History className="w-3 h-3" />
                  Recent Searches
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 5).map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setQuery(search); performSearch(search) }}
                    className="px-3 py-1.5 text-sm bg-slate-800/30 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-all truncate max-w-[250px] flex items-center gap-2"
                  >
                    <Clock className="w-3 h-3 opacity-50" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/50 rounded-xl p-1 border border-slate-800 w-fit">
          {[
            { id: 'cases', label: 'Search Results', icon: BookOpen, count: hasSearched ? totalCount : 0 },
            { id: 'saved', label: 'Saved Cases', icon: Bookmark, count: savedCases.length },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as SearchTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === id ? 'bg-white/20' : 'bg-slate-700'
                }`}>
                  {count > 999 ? '999+' : count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Results */}
        {activeTab === 'cases' && (
          <>
            {/* Loading state */}
            {isSearching && (
              <div className="text-center py-16">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-spin" />
                <p className="text-slate-400">Searching case law...</p>
              </div>
            )}

            {/* No results */}
            {hasSearched && !isSearching && results.length === 0 && !error && (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                <p className="text-slate-400 text-lg">No cases found matching your search.</p>
                <p className="text-slate-500 text-sm mt-2">Try different keywords or adjust your court filter.</p>
              </div>
            )}

            {/* Results list */}
            {!isSearching && results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span>Found <span className="text-indigo-400 font-semibold">{totalCount.toLocaleString()}</span> cases</span>
                  <span>Page {page} of {totalPages}</span>
                </div>

                {results.map((result) => (
                  <div
                    key={result.id}
                    className="group p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg group-hover:text-indigo-300 transition-colors line-clamp-2">
                          {result.caseName}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-sm font-medium text-indigo-400">{result.citation}</span>
                          {result.year && (
                            <span className="text-sm text-slate-500">({result.year})</span>
                          )}
                          {result.citeCount !== undefined && result.citeCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                              <Award className="w-3 h-3" />
                              {result.citeCount.toLocaleString()} citations
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            result.courtType === 'federal' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {result.courtType === 'federal' ? 'Federal' : 'State'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">{result.court}</div>
                        
                        <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">{result.snippet}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleSaveCase(result)}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isSaved(result.id)
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                          title={isSaved(result.id) ? 'Remove from saved' : 'Save case'}
                        >
                          {isSaved(result.id) ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                          {isSaved(result.id) ? 'Saved' : 'Save'}
                        </button>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Full
                        </a>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6">
                    <button
                      onClick={() => performSearch(query, page - 1)}
                      disabled={page === 1 || isSearching}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 transition-all"
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
                            onClick={() => performSearch(query, pageNum)}
                            disabled={isSearching}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                              page === pageNum
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => performSearch(query, page + 1)}
                      disabled={page === totalPages || isSearching}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state when no search yet */}
            {!hasSearched && !isSearching && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
                  <Scale className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Start Your Research</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Search for case law using keywords, citations, or legal concepts. Results include California state and federal court opinions.
                </p>
              </div>
            )}
          </>
        )}

        {/* Saved Cases Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            {savedCases.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
                  <Bookmark className="w-10 h-10 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Saved Cases Yet</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Save cases during your research to access them later. Your saved cases are stored locally in your browser.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400">{savedCases.length} saved case{savedCases.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={handleClearSaved}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                {savedCases.map((result) => (
                  <div
                    key={result.id}
                    className="group p-5 rounded-xl bg-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg line-clamp-2">{result.caseName}</h3>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-sm font-medium text-indigo-400">{result.citation}</span>
                          {result.year && <span className="text-sm text-slate-500">({result.year})</span>}
                          {result.citeCount !== undefined && result.citeCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                              <Award className="w-3 h-3" />
                              {result.citeCount.toLocaleString()} citations
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">{result.court}</div>
                        {result.snippet && (
                          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                            <p className="text-sm text-slate-400 line-clamp-2">{result.snippet}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleSaveCase(result)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Court Info Footer */}
        <div className="mt-12 p-6 bg-slate-900/50 rounded-xl border border-slate-800">
          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Available Courts
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-emerald-400 font-medium">California State</div>
              <div className="text-slate-400">• Supreme Court</div>
              <div className="text-slate-400">• Court of Appeal</div>
            </div>
            <div className="space-y-2">
              <div className="text-blue-400 font-medium">Federal Appeals</div>
              <div className="text-slate-400">• 9th Circuit</div>
            </div>
            <div className="space-y-2">
              <div className="text-blue-400 font-medium">Federal District</div>
              <div className="text-slate-400">• N.D. California</div>
              <div className="text-slate-400">• C.D. California</div>
              <div className="text-slate-400">• E.D. California</div>
              <div className="text-slate-400">• S.D. California</div>
            </div>
            <div className="space-y-2">
              <div className="text-slate-500 text-xs mt-2">
                Note: CA Superior Court (trial court) opinions are not published and not available.
              </div>
            </div>
          </div>
        </div>

        {/* Attribution */}
        <div className="text-center text-sm text-slate-500 pt-8 mt-8 border-t border-slate-800">
          Powered by{' '}
          <a href="https://www.courtlistener.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
            CourtListener
          </a>{' '}
          — Free Law Project (includes Harvard Caselaw Access Project data)
        </div>
      </div>

      <Footer />
    </div>
  )
}

