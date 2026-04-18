/**
 * AI Mission Planner Agent
 * Autonomous strategic planning for offensive and defensive cyber operations
 */


export interface PlanningRequest {
  objective: string;
  type: 'offensive' | 'defensive' | 'pentest' | 'incident_response';
  targetScope?: string;
  constraints?: string[];
  timeframe?: string;
  resources?: string[];
}

export interface GeneratedPlan {
  name: string;
  objective: string;
  strategy: string;
  phases: GeneratedPhase[];
  risks: GeneratedRisk[];
  successCriteria: string[];
  failureScenarios: string[];
  timeline: {
    estimatedDuration: number; // hours
    criticalPath: string[];
  };
  aiAssessment: {
    feasibilityScore: number;
    riskScore: number;
    successProbability: number;
    recommendations: string[];
    warnings: string[];
  };
}

export interface GeneratedPhase {
  name: string;
  description: string;
  duration: number; // hours
  tasks: GeneratedTask[];
  dependencies: string[];
  tools: string[];
  techniques: string[];
}

export interface GeneratedTask {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number; // hours
  requiredSkills: string[];
  potentialRisks: string[];
}

export interface GeneratedRisk {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100
  impact: number; // 0-100
  mitigation: string;
  contingency: string;
}

export interface PlanModificationRequest {
  currentPlan: any;
  modificationType: 'optimize' | 'add_phase' | 'reduce_risk' | 'accelerate' | 'enhance_stealth';
  requirements: string;
}

class MissionPlannerAgent {
  private systemPrompt = `You are GHOST AI Mission Planner, an elite strategic planning agent for cybersecurity operations.

Your role is to generate comprehensive, tactical mission plans for:
- Offensive operations (Red Team attacks)
- Defensive operations (Blue Team defense)
- Penetration testing
- Incident response

For each planning request, you must create:

1. **Strategic Overview**
   - Mission name (tactical, creative)
   - Clear objective
   - Overall strategy

2. **Operational Phases**
   - Detailed phases with specific tasks
   - Realistic time estimates
   - Required tools and techniques
   - Dependencies between phases

3. **Risk Assessment**
   - Identify potential risks (severity, probability, impact)
   - Mitigation strategies
   - Contingency plans

4. **Success & Failure Analysis**
   - Clear success criteria
   - Potential failure scenarios
   - Critical checkpoints

5. **AI Assessment**
   - Feasibility score (0-100): How realistic is this plan?
   - Risk score (0-100): Overall risk level
   - Success probability (0-100): Likelihood of success
   - Specific recommendations
   - Warnings about critical risks

**Output Format:**
Respond ONLY with valid JSON matching the GeneratedPlan interface.
No markdown, no code blocks, just raw JSON.

**Scoring Guidelines:**
- Feasibility: Consider resources, complexity, technical requirements
- Risk: Account for detection probability, legal issues, technical challenges
- Success: Based on target difficulty, team skills, available time

**Be realistic and tactical. Think like a professional penetration tester and security operations expert.**`;

  /**
   * Generate a complete mission plan from objectives
   */
  async generatePlan(request: PlanningRequest): Promise<GeneratedPlan> {
    console.log('🧠 AI Planner Agent: Generating mission plan...');
    console.log('📋 Request:', request);

    const userPrompt = `Generate a comprehensive mission plan:

**Type:** ${request.type.toUpperCase()}
**Objective:** ${request.objective}
${request.targetScope ? `**Target Scope:** ${request.targetScope}` : ''}
${request.constraints?.length ? `**Constraints:** ${request.constraints.join(', ')}` : ''}
${request.timeframe ? `**Timeframe:** ${request.timeframe}` : ''}
${request.resources?.length ? `**Available Resources:** ${request.resources.join(', ')}` : ''}

Create a detailed, tactical plan with:
1. Creative mission name
2. Strategic approach
3. 4-6 operational phases with specific tasks
4. Comprehensive risk assessment
5. Success criteria and failure scenarios
6. Realistic AI assessment scores

${this.getTypeSpecificGuidance(request.type)}

Output JSON only.`;

    try {
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI planner');
      }

      // Parse JSON response
      const cleanContent = this.extractJSON(content);
      const plan: GeneratedPlan = JSON.parse(cleanContent);

      console.log('✅ AI Planner Agent: Plan generated successfully');
      console.log('📊 Feasibility:', plan.aiAssessment.feasibilityScore);
      console.log('⚠️ Risk Score:', plan.aiAssessment.riskScore);
      console.log('🎯 Success Probability:', plan.aiAssessment.successProbability);

      return plan;
    } catch (error) {
      console.error('❌ AI Planner Agent: Generation failed:', error);
      throw new Error(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Modify an existing plan based on requirements
   */
  async modifyPlan(request: PlanModificationRequest): Promise<GeneratedPlan> {
    console.log('🔧 AI Planner Agent: Modifying mission plan...');
    console.log('🎯 Modification type:', request.modificationType);

    const modificationGuidance = this.getModificationGuidance(request.modificationType);

    const userPrompt = `Modify the following mission plan:

${JSON.stringify(request.currentPlan, null, 2)}

**Modification Required:** ${request.modificationType}
**Requirements:** ${request.requirements}

${modificationGuidance}

Output the complete modified plan as JSON only.`;

    try {
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI planner');
      }

      const cleanContent = this.extractJSON(content);
      const plan: GeneratedPlan = JSON.parse(cleanContent);

      console.log('✅ AI Planner Agent: Plan modified successfully');
      return plan;
    } catch (error) {
      console.error('❌ AI Planner Agent: Modification failed:', error);
      throw new Error(`Failed to modify plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze a plan and provide recommendations
   */
  async analyzePlan(plan: any): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }> {
    console.log('📊 AI Planner Agent: Analyzing mission plan...');

    const userPrompt = `Analyze this mission plan and provide strategic feedback:

${JSON.stringify(plan, null, 2)}

Provide:
1. Overall score (0-100)
2. UilKeySkeleton strengths
3. Critical weaknesses
4. Actionable recommendations

Output as JSON:
{
  "score": number,
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": string[]
}`;

    try {
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI planner');
      }

      const cleanContent = this.extractJSON(content);
      const analysis = JSON.parse(cleanContent);

      console.log('✅ AI Planner Agent: Analysis complete, score:', analysis.score);
      return analysis;
    } catch (error) {
      console.error('❌ AI Planner Agent: Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  private extractJSON(content: string): string {
    // Remove markdown code blocks if present
    let cleaned = content.trim();

    // Remove ```json ... ``` or ``` ... ```
    if (cleaned.startsWith('```')) {
      const firstNewline = cleaned.indexOf('\n');
      const lastBackticks = cleaned.lastIndexOf('```');
      if (firstNewline !== -1 && lastBackticks !== -1) {
        cleaned = cleaned.substring(firstNewline + 1, lastBackticks).trim();
      }
    }

    return cleaned;
  }

  /**
   * Get type-specific planning guidance
   */
  private getTypeSpecificGuidance(type: string): string {
    switch (type) {
      case 'offensive':
        return `**Offensive Operation Guidelines:**
- Focus on stealth, persistence, and lateral movement
- Include reconnaissance, initial access, privilege escalation, exfiltration
- Consider detection evasion techniques
- Include cleanup and anti-forensics phases`;

      case 'defensive':
        return `**Defensive Operation Guidelines:**
- Focus on detection, containment, and recovery
- Include monitoring, threat hunting, and incident response
- Consider security hardening and resilience
- Include post-incident analysis`;

      case 'pentest':
        return `**Penetration Test Guidelines:**
- Follow structured methodology (OWASP, PTES, etc.)
- Include vulnerability scanning, exploitation, and reporting
- Consider both technical and business impact
- Include remediation recommendations`;

      case 'incident_response':
        return `**Incident Response Guidelines:**
- Follow NIST/SANS incident response framework
- Include detection, analysis, containment, eradication, recovery
- Consider evidence preservation and forensics
- Include lessons learned phase`;

      default:
        return '';
    }
  }

  /**
   * Get modification-specific guidance
   */
  private getModificationGuidance(type: string): string {
    switch (type) {
      case 'optimize':
        return 'Optimize the plan for efficiency while maintaining effectiveness. Reduce unnecessary steps, parallelize tasks, and streamline the critical path.';

      case 'add_phase':
        return 'Add a new operational phase that integrates seamlessly with existing phases. Update dependencies and timeline accordingly.';

      case 'reduce_risk':
        return 'Reduce the overall risk level by adding mitigation strategies, safety checks, and fallback options. Lower the risk score while maintaining objectives.';

      case 'accelerate':
        return 'Accelerate the timeline by parallelizing tasks, removing non-critical activities, and optimizing resource allocation. Maintain quality and success probability.';

      case 'enhance_stealth':
        return 'Enhance operational stealth and reduce detection probability. Add evasion techniques, diversionary tactics, and anti-forensics measures.';

      default:
        return 'Modify the plan according to requirements while maintaining strategic coherence and operational feasibility.';
    }
  }

  /**
   * Generate attack vector diagram data
   */
  async generateAttackDiagram(plan: any): Promise<{
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  }> {
    // This would generate a visual attack flow diagram
    // For now, return a simple structure based on phases
    const nodes = [];
    const edges = [];

    if (plan.phases && Array.isArray(plan.phases)) {
      plan.phases.forEach((phase: any, index: number) => {
        nodes.push({
          id: `phase-${index}`,
          label: phase.name || `Phase ${index + 1}`,
          type: 'phase'
        });

        if (index > 0) {
          edges.push({
            from: `phase-${index - 1}`,
            to: `phase-${index}`,
            label: 'leads to'
          });
        }
      });
    }

    return { nodes, edges };
  }
}

// Export singleton instance
export const missionPlannerAgent = new MissionPlannerAgent();
export default missionPlannerAgent;
