import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { anonymizeDataWithMapping, reidentifyData, PIIMapping, ContextualMapping } from '@/lib/utils/anonymize';

interface BillingTemplate {
  id: string;
  time: string;
  description: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  category: string;
  templates: BillingTemplate[];
}

// Cache templates in memory
let cachedTemplates: TemplateCategory[] | null = null;

async function loadTemplates(): Promise<TemplateCategory[]> {
  if (cachedTemplates) return cachedTemplates;
  
  try {
    // Use dynamic imports instead of fs - works better in Next.js API routes
    const [
      litigationGeneral,
      discovery,
      motionPractice,
      protectiveOrder,
      protectiveOrderExpanded,
      subpoenaDeposition
    ] = await Promise.all([
      import('../../../server/templates/litigation-general.json').then(m => m.default).catch(() => null),
      import('../../../server/templates/discovery.json').then(m => m.default).catch(() => null),
      import('../../../server/templates/motion-practice.json').then(m => m.default).catch(() => null),
      import('../../../server/templates/protective-order.json').then(m => m.default).catch(() => null),
      import('../../../server/templates/protective-order-expanded.json').then(m => m.default).catch(() => null),
      import('../../../server/templates/subpoena-deposition.json').then(m => m.default).catch(() => null),
    ]);
    
    const templates: TemplateCategory[] = [
      litigationGeneral,
      discovery,
      motionPractice,
      protectiveOrder,
      protectiveOrderExpanded,
      subpoenaDeposition
    ].filter((t): t is TemplateCategory => t !== null);
    
    cachedTemplates = templates;
    return templates;
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
}

// Find matching templates based on user description keywords
function findMatchingTemplates(description: string, templates: TemplateCategory[]): BillingTemplate[] {
  const lowerDesc = description.toLowerCase();
  const matches: Array<{ template: BillingTemplate; score: number; categoryName: string }> = [];
  
  // Keywords to match against
  const keywords = lowerDesc.split(/\s+/).filter(w => w.length > 3);
  
  for (const category of templates) {
    for (const template of category.templates) {
      const templateLower = template.description.toLowerCase();
      let score = 0;
      
      // Score based on keyword matches
      for (const keyword of keywords) {
        if (templateLower.includes(keyword)) {
          score += 2;
        }
      }
      
      // Boost score for specific activity matches
      const activities = [
        { keywords: ['draft', 'drafting', 'wrote', 'write'], boost: 3 },
        { keywords: ['research', 'researched', 'researching'], boost: 3 },
        { keywords: ['review', 'reviewed', 'reviewing', 'analyze', 'analyzed'], boost: 3 },
        { keywords: ['deposition', 'depo'], boost: 4 },
        { keywords: ['motion', 'oppose', 'opposition'], boost: 4 },
        { keywords: ['discovery', 'interrogatories', 'rfp', 'rfa'], boost: 4 },
        { keywords: ['call', 'called', 'conference', 'phone'], boost: 3 },
        { keywords: ['meeting', 'met', 'confer'], boost: 3 },
        { keywords: ['subpoena', 'subpoenas'], boost: 4 },
        { keywords: ['medical', 'records', 'treatment'], boost: 3 },
        { keywords: ['summary', 'judgment', 'msj'], boost: 4 },
        { keywords: ['trial', 'hearing', 'court'], boost: 3 },
        { keywords: ['settlement', 'negotiate', 'demand'], boost: 3 },
        { keywords: ['complaint', 'answer', 'pleading'], boost: 3 },
        { keywords: ['protective', 'order'], boost: 4 },
      ];
      
      for (const activity of activities) {
        const userHas = activity.keywords.some(k => lowerDesc.includes(k));
        const templateHas = activity.keywords.some(k => templateLower.includes(k));
        if (userHas && templateHas) {
          score += activity.boost;
        }
      }
      
      if (score > 0) {
        matches.push({ template, score, categoryName: category.name });
      }
    }
  }
  
  // Sort by score and return top matches
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 5).map(m => m.template);
}

// Extract time estimate from matching templates
function getTimeEstimate(matchingTemplates: BillingTemplate[], description: string): number {
  if (matchingTemplates.length === 0) {
    // Default estimates based on common tasks
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('call') || lowerDesc.includes('email')) return 0.3;
    if (lowerDesc.includes('meeting')) return 1.0;
    if (lowerDesc.includes('review')) return 1.5;
    if (lowerDesc.includes('draft')) return 2.0;
    if (lowerDesc.includes('research')) return 2.0;
    if (lowerDesc.includes('deposition')) return 3.0;
    if (lowerDesc.includes('motion')) return 4.0;
    return 0.5; // Default
  }
  
  // Use the best matching template's time, or average of top matches
  const times = matchingTemplates.slice(0, 3).map(t => parseFloat(t.time));
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  
  // Adjust based on complexity indicators in user description
  const lowerDesc = description.toLowerCase();
  let multiplier = 1.0;
  
  if (lowerDesc.includes('brief') || lowerDesc.includes('quick') || lowerDesc.includes('short')) {
    multiplier = 0.6;
  } else if (lowerDesc.includes('extensive') || lowerDesc.includes('detailed') || lowerDesc.includes('comprehensive')) {
    multiplier = 1.4;
  } else if (lowerDesc.includes('multiple') || lowerDesc.includes('several')) {
    multiplier = 1.3;
  }
  
  return Math.round(avgTime * multiplier * 10) / 10;
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Authentication check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('[SECURITY] Attempted to generate billing without authentication')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Step 1: Parse request body
    let caseName: string, description: string, providedHours: string | undefined;
    try {
      const body = await req.json();
      caseName = body.caseName;
      description = body.description;
      providedHours = body.providedHours;
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Failed to parse request body', message: parseError.message },
        { status: 400 }
      );
    }
    
    if (!description) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    // Step 2: Check OpenAI config
    let isConfigured = false;
    try {
      const { isOpenAIConfigured } = await import('@/lib/openai/config');
      isConfigured = isOpenAIConfigured();
    } catch (configError: any) {
      return NextResponse.json(
        { error: 'Failed to load OpenAI config', message: configError.message },
        { status: 500 }
      );
    }
    
    if (!isConfigured) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', message: 'Please add OPENAI_API_KEY to your .env.local file' },
        { status: 500 }
      );
    }

    // Step 3: Load templates (non-critical, continue if fails)
    let templates: TemplateCategory[] = [];
    let matchingTemplates: BillingTemplate[] = [];
    try {
      templates = await loadTemplates();
      matchingTemplates = findMatchingTemplates(description, templates);
    } catch (templateError: any) {
      console.error('Template loading failed, continuing without templates:', templateError);
      // Continue without templates - not critical
    }
    
    const suggestedHours = providedHours 
      ? parseFloat(providedHours) 
      : getTimeEstimate(matchingTemplates, description);

    // Step 4: Anonymize user inputs
    let caseNameResult, descriptionResult;
    try {
      caseNameResult = anonymizeDataWithMapping(caseName || 'General');
      descriptionResult = anonymizeDataWithMapping(description);
    } catch (anonError: any) {
      return NextResponse.json(
        { error: 'Failed to process input data', message: anonError.message },
        { status: 500 }
      );
    }

    // Merge mappings
    const combinedMapping: PIIMapping = {};
    Object.keys(caseNameResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...caseNameResult.mapping[key]];
    });
    Object.keys(descriptionResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...descriptionResult.mapping[key]];
    });

    // Merge contextual mappings
    const combinedContextualMappings: ContextualMapping[] = [
      ...caseNameResult.contextualMappings,
      ...descriptionResult.contextualMappings
    ];

    // Build template examples for the AI
    let templateExamples = '';
    if (matchingTemplates.length > 0) {
      templateExamples = `\n\nRELEVANT TEMPLATE EXAMPLES (use similar style and detail level):
${matchingTemplates.slice(0, 3).map((t, i) => `${i + 1}. "${t.description}"`).join('\n')}`;
    }

    const prompt = `You are a legal billing assistant. Convert this informal work description into a professional billing entry.

USER'S WORK DESCRIPTION:
${descriptionResult.anonymizedText}
${templateExamples}

RULES:
1. Create a single, professional billing entry using proper legal billing language
2. Be specific about what was done - use active voice and past tense
3. Include specific legal actions (drafted, reviewed, analyzed, prepared, researched, attended, conferred, etc.)
4. Match the style and detail level of the template examples if provided
5. Do NOT include time estimates or hours in the text
6. Do NOT include specific case names or party names in the output
7. Use placeholders like [client] or [opposing party] only if essential to the description
8. Keep it concise but complete - aim for 1-3 sentences
9. If multiple tasks were performed, list them clearly with semicolons

RESPOND WITH ONLY THE PROFESSIONAL BILLING ENTRY TEXT.`;

    // Step 5: Call OpenAI
    let billingEntry = '';
    try {
      const { getOpenAIClient, getOpenAIModel } = await import('@/lib/openai/config');
      const openai = getOpenAIClient();
      const model = getOpenAIModel();
      
      console.log('Calling OpenAI with model:', model);
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal billing assistant. You convert informal work descriptions into professional, detailed billing entries suitable for client invoices. Your entries use proper legal terminology, are specific about work performed, and match the style of established billing templates. Never include time estimates in the billing entry text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      });

      // Log full response structure to debug GPT-5 format
      console.log('OpenAI Response - Full structure:', JSON.stringify(response, null, 2));
      console.log('Response choices:', response.choices);
      console.log('First choice:', response.choices?.[0]);
      console.log('Message:', response.choices?.[0]?.message);
      console.log('Content:', response.choices?.[0]?.message?.content);
      
      // Try different possible content locations for GPT-5
      billingEntry = response.choices?.[0]?.message?.content?.trim() 
        || (response as any).output?.trim()
        || (response as any).text?.trim()
        || (response as any).choices?.[0]?.text?.trim()
        || '';
      
      console.log('Extracted billingEntry:', billingEntry);
      
      if (!billingEntry) {
        return NextResponse.json(
          { 
            error: 'AI returned empty response', 
            message: 'The AI model returned no content. Response structure may have changed.',
            debug: {
              hasChoices: !!response.choices,
              choicesLength: response.choices?.length,
              firstChoice: response.choices?.[0] ? 'exists' : 'missing',
              messageExists: !!response.choices?.[0]?.message,
              contentExists: !!response.choices?.[0]?.message?.content
            }
          },
          { status: 500 }
        );
      }
    } catch (openaiError: any) {
      console.error('OpenAI API Error - Full details:');
      console.error('Error message:', openaiError?.message);
      console.error('Error code:', openaiError?.code);
      console.error('Error status:', openaiError?.status);
      console.error('Error type:', openaiError?.type);
      console.error('Error param:', openaiError?.param);
      
      const errorMessage = openaiError?.message || openaiError?.error?.message || 'Unknown OpenAI error';
      const errorCode = openaiError?.code || openaiError?.error?.code || 'unknown';
      
      if (errorCode === 'insufficient_quota') {
        return NextResponse.json(
          { error: 'AI service quota exceeded', message: 'Please check your OpenAI account billing.' },
          { status: 429 }
        );
      }
      
      if (errorCode === 'rate_limit_exceeded') {
        return NextResponse.json(
          { error: 'Rate limit exceeded', message: 'Please try again in a moment.' },
          { status: 429 }
        );
      }
      
      if (errorCode === 'invalid_api_key') {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key', message: 'Please check your OPENAI_API_KEY in .env.local' },
          { status: 401 }
        );
      }
      
      if (openaiError?.status === 404) {
        return NextResponse.json(
          { error: 'Model not found', message: `The model "${process.env.OPENAI_MODEL || 'gpt-4'}" is not available. Try setting OPENAI_MODEL=gpt-3.5-turbo in .env.local` },
          { status: 404 }
        );
      }
      
      // Return detailed error for debugging
      return NextResponse.json(
        { error: 'OpenAI API error', message: errorMessage, code: errorCode, param: openaiError?.param },
        { status: 500 }
      );
    }

    // Step 6: Re-identify and clean up
    try {
      billingEntry = reidentifyData(billingEntry, combinedMapping, combinedContextualMappings);
      billingEntry = billingEntry
        .replace(/^["']|["']$/g, '')
        .replace(/^\d+\.?\d*\s*(?:hours?|hrs?)?:?\s*/i, '')
        .replace(/^[-•]\s*/, '')
        .trim();
    } catch (cleanupError: any) {
      console.error('Cleanup error (non-critical):', cleanupError);
      // Continue with original billing entry
    }

    return NextResponse.json({
      success: true,
      result: billingEntry,
      suggestedHours: suggestedHours,
      matchedTemplates: matchingTemplates.slice(0, 3).map(t => ({
        description: t.description,
        time: t.time
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Unexpected error in generateBilling:', error);
    
    return NextResponse.json(
      { error: 'Unexpected server error', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
