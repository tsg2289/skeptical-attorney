/**
 * Discovery Response - AI Response Generation API
 * 
 * Generates objections and responses for discovery requests
 * Uses California objection library and case data
 * 
 * Security: Server-only, mandatory anonymization, RLS-protected
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { 
  anonymizeCaseData, 
  deanonymizeText, 
  logAnonymizationEvent 
} from '@/lib/utils/anonymization';
import {
  getObjectionsForType,
  suggestObjections,
  RESPONSE_TRANSITION,
  DISCOVERY_RESERVATION,
  DEFINITIONS_OBJECTION_INTERROGATORY,
  DEFINITIONS_OBJECTION_RFA,
  type DiscoveryResponseType,
} from '@/lib/data/californiaObjections';

// Initialize OpenAI client - server-only, key from env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface DiscoveryRequest {
  id: string;
  requestNumber: number;
  originalText: string;
  category?: string;
}

interface GeneratedResponse {
  id: string;
  requestNumber: number;
  originalRequest: string;
  objections: string[];
  objectionTexts: string[];
  answer: string;
  suggestedObjectionIds: string[];
  status: 'draft';
}

interface GenerateResponsesRequest {
  caseId: string;
  discoveryType: DiscoveryResponseType;
  requests: DiscoveryRequest[];
  generateAnswers: boolean;
  caseFacts?: string;
}

interface GenerateResponsesResponse {
  success: boolean;
  responses: GeneratedResponse[];
  error?: string;
}

/**
 * Build system prompt for AI with objection library context
 */
function buildSystemPrompt(discoveryType: DiscoveryResponseType, caseContext: string): string {
  const objections = getObjectionsForType(discoveryType);
  const objectionList = objections.map(o => `- ${o.id}: ${o.shortForm}`).join('\n');
  
  const discoveryTypeLabel = discoveryType === 'interrogatories' 
    ? 'Special Interrogatories' 
    : discoveryType === 'rfp' 
      ? 'Requests for Production of Documents' 
      : 'Requests for Admission';

  const definitionsObjection = discoveryType === 'rfa' 
    ? DEFINITIONS_OBJECTION_RFA 
    : DEFINITIONS_OBJECTION_INTERROGATORY;

  return `You are an expert California litigation attorney preparing responses to ${discoveryTypeLabel}.

CASE CONTEXT:
${caseContext}

AVAILABLE OBJECTIONS (use these IDs in your response):
${objectionList}

RESPONSE FORMAT REQUIREMENTS:
1. For each request, identify applicable objections from the list above
2. After objections, use this transition: "${RESPONSE_TRANSITION}"
3. Provide a substantive response that protects the client while being compliant
4. End with: "${DISCOVERY_RESERVATION}"
5. NEVER fabricate facts - only use information from the case context provided
6. If insufficient information is available, state that after objections

DEFINITIONS OBJECTION (use when applicable):
${definitionsObjection}

OUTPUT FORMAT (JSON):
For each request, return:
{
  "requestNumber": <number>,
  "objectionIds": ["obj_id_1", "obj_id_2"],
  "answer": "Your substantive response here"
}

IMPORTANT RULES:
- Always object to overbroad, burdensome, or vague requests
- Protect privileged information with attorney-client privilege objection
- For contention interrogatories, use premature and work product objections
- For RFAs: respond with "Admit", "Deny", or qualified response with objections
- For RFPs: state what documents will/won't be produced after objections
- NEVER hallucinate or invent facts not in the case context
- Use neutral placeholders like "[Responding Party]" and "[Propounding Party]"`;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponses(
  aiText: string, 
  originalRequests: DiscoveryRequest[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _discoveryType: DiscoveryResponseType
): GeneratedResponse[] {
  const responses: GeneratedResponse[] = [];
  
  try {
    // Try to parse as JSON array
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      for (const item of parsed) {
        const originalRequest = originalRequests.find(r => r.requestNumber === item.requestNumber);
        if (!originalRequest) continue;

        // Get suggested objection IDs
        const suggestedIds = suggestObjections(originalRequest.originalText, _discoveryType);
        
        responses.push({
          id: originalRequest.id,
          requestNumber: item.requestNumber,
          originalRequest: originalRequest.originalText,
          objections: item.objectionIds || [],
          objectionTexts: [], // Will be populated from objection library
          answer: item.answer || '',
          suggestedObjectionIds: [...new Set([...suggestedIds, ...(item.objectionIds || [])])],
          status: 'draft',
        });
      }
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
    
    // Fallback: create basic responses with suggested objections
    for (const req of originalRequests) {
      const suggestedIds = suggestObjections(req.originalText, _discoveryType);
      
      responses.push({
        id: req.id,
        requestNumber: req.requestNumber,
        originalRequest: req.originalText,
        objections: suggestedIds,
        objectionTexts: [],
        answer: `Subject to and without waiving the foregoing objections, Responding Party states that investigation and discovery are ongoing. ${DISCOVERY_RESERVATION}`,
        suggestedObjectionIds: suggestedIds,
        status: 'draft',
      });
    }
  }
  
  return responses;
}

/**
 * Log audit event for SOC2 compliance
 */
async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  userId: string,
  action: string,
  discoveryType: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('discovery_response_audit_log').insert({
      case_id: caseId,
      user_id: userId,
      action,
      discovery_type: discoveryType,
      details,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponsesResponse>> {
  try {
    // Initialize Supabase client with RLS
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, responses: [], error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateResponsesRequest = await request.json();
    const { caseId, discoveryType, requests, generateAnswers = true, caseFacts } = body;

    if (!caseId || !discoveryType || !requests?.length) {
      return NextResponse.json(
        { success: false, responses: [], error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user has access to case (RLS check)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { success: false, responses: [], error: 'Case not found or access denied' },
        { status: 403 }
      );
    }

    // Build case context from case data
    const plaintiffs = caseData.plaintiffs || [];
    const defendants = caseData.defendants || [];
    
    const caseContext = [
      `Case Type: ${caseData.case_type || 'Civil Litigation'}`,
      `Case Description: ${caseData.case_description || 'Not provided'}`,
      plaintiffs.length > 0 ? `Plaintiff(s): ${plaintiffs.map((p: { name: string }) => p.name).join(', ')}` : '',
      defendants.length > 0 ? `Defendant(s): ${defendants.map((d: { name: string }) => d.name).join(', ')}` : '',
      caseFacts ? `Additional Case Facts: ${caseFacts}` : '',
    ].filter(Boolean).join('\n');

    // Combine discovery requests into a single text block
    const discoveryText = requests
      .map(r => `REQUEST NO. ${r.requestNumber}: ${r.originalText}`)
      .join('\n\n');

    // ANONYMIZATION: Critical for SOC2 compliance
    // Anonymize all data before sending to AI
    const { anonymized, map } = anonymizeCaseData({
      caseDescription: caseContext,
      discoveryText,
    });

    // Log anonymization event
    logAnonymizationEvent(caseId, user.id, 'anonymize', Object.keys(map).length);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(discoveryType, anonymized.caseDescription || '');

    // Build user prompt with anonymized discovery requests
    const userPrompt = `Please generate responses for the following ${discoveryType} requests. Return your response as a JSON array.

${anonymized.discoveryText}

${generateAnswers 
  ? 'Please provide substantive answers after objections based on the case context provided.' 
  : 'Focus primarily on objections; answers can be minimal.'}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent legal writing
      max_tokens: 4000,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // DE-ANONYMIZATION: Restore original values
    const deanonymizedResponse = deanonymizeText(aiResponse, map);

    // Log de-anonymization event
    logAnonymizationEvent(caseId, user.id, 'deanonymize', Object.keys(map).length);

    // Parse AI responses into structured format
    const responses = parseAIResponses(deanonymizedResponse, requests, discoveryType);

    // Log audit event
    await logAuditEvent(supabase, caseId, user.id, 'RESPONSES_GENERATED', discoveryType, {
      requestCount: requests.length,
      responseCount: responses.length,
      generateAnswers,
      model: 'gpt-4-turbo-preview',
    });

    return NextResponse.json({
      success: true,
      responses,
    });

  } catch (error) {
    console.error('Generate responses error:', error);
    return NextResponse.json(
      { 
        success: false, 
        responses: [], 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}


