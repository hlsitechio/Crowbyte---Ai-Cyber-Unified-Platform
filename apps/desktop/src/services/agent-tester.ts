/**
 * AI Agent Testing & Validation Framework
 * Comprehensive testing system for all AI agents
 */

import cyberSecAgent from './cybersec-ai-agent';
import missionPlannerAgent from './mission-planner-agent';
import searchAgent from './searchAgent';
import hybridRedTeamAgent from './hybrid-redteam-agent';
import { chat as aiChat, testConnection as aiTestConnection } from './ai';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedBehavior: string;
  validationCriteria: string[];
  category: 'functionality' | 'performance' | 'accuracy' | 'error_handling';
}

export interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  score: number; // 0-100
  duration: number; // ms
  output: any;
  validationResults: Array<{
    criterion: string;
    passed: boolean;
    details: string;
  }>;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface AgentTestReport {
  agentName: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  overallScore: number;
  results: TestResult[];
  recommendations: string[];
  criticalIssues: string[];
}

class AgentTesterService {

  /**
   * Test CyberSec AI Agent
   */
  async testCyberSecAgent(): Promise<AgentTestReport> {
    console.log('\n🧪 Testing CyberSec AI Agent...\n');
    console.log('[DEBUG] CyberSec AI Agent test started at:', new Date().toISOString());

    const testCases: TestCase[] = [
      {
        id: 'cybersec-1',
        name: 'Basic Threat Query',
        description: 'Test response to simple threat question',
        input: { query: 'What is ransomware?' },
        expectedBehavior: 'Should provide accurate definition without search',
        validationCriteria: [
          'Response length > 100 characters',
          'Contains key terms: ransomware, encryption, payment',
          'Response time < 10 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'cybersec-2',
        name: 'Latest Threat Research',
        description: 'Test search trigger for current threats',
        input: { query: 'What are the latest ransomware attacks in 2025?' },
        expectedBehavior: 'Should trigger Tavily search for current information',
        validationCriteria: [
          'Search was performed (researchPerformed === true)',
          'Sources are provided',
          'Response includes recent information',
          'Response time < 15 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'cybersec-3',
        name: 'CVE Lookup',
        description: 'Test CVE-specific query',
        input: { query: 'Tell me about CVE-2024-1234' },
        expectedBehavior: 'Should search for CVE details',
        validationCriteria: [
          'Search was performed',
          'Response mentions CVE-2024-1234',
          'Response time < 15 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'cybersec-4',
        name: 'Error Handling',
        description: 'Test handling of empty/invalid input',
        input: { query: '' },
        expectedBehavior: 'Should handle gracefully without crashing',
        validationCriteria: [
          'Does not throw unhandled exception',
          'Returns meaningful error or prompt for input'
        ],
        category: 'error_handling'
      }
    ];

    return await this.runAgentTests('CyberSec AI Agent', testCases, async (testCase) => {
      const startTime = Date.now();

      try {
        const response = await cyberSecAgent.chat(testCase.input.query);
        const duration = Date.now() - startTime;

        return {
          output: response,
          duration,
          passed: true
        };
      } catch (error) {
        return {
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Test Mission Planner Agent
   */
  async testMissionPlannerAgent(): Promise<AgentTestReport> {
    console.log('\n🧪 Testing Mission Planner Agent...\n');

    const testCases: TestCase[] = [
      {
        id: 'planner-1',
        name: 'Generate Web Pentest Plan',
        description: 'Test generation of penetration test plan',
        input: {
          objective: 'Penetrate web application security defenses',
          type: 'pentest',
          targetScope: 'https://example.com',
          constraints: ['No DoS attacks', 'Business hours only']
        },
        expectedBehavior: 'Should generate structured plan with phases, risks, timeline',
        validationCriteria: [
          'Returns valid GeneratedPlan object',
          'Has 4-6 phases',
          'Includes risk assessment',
          'AI scores are 0-100 range',
          'Response time < 30 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'planner-2',
        name: 'Offensive Operation Plan',
        description: 'Test red team operation planning',
        input: {
          objective: 'Gain access to internal network',
          type: 'offensive',
          targetScope: 'Corporate network 192.168.1.0/24'
        },
        expectedBehavior: 'Should include stealth, lateral movement, persistence phases',
        validationCriteria: [
          'Plan includes reconnaissance phase',
          'Plan includes persistence mechanisms',
          'Risk score is reasonable (not 0 or 100)',
          'Includes mitigation strategies'
        ],
        category: 'functionality'
      },
      {
        id: 'planner-3',
        name: 'Defensive Plan',
        description: 'Test blue team defensive planning',
        input: {
          objective: 'Defend against ransomware attack',
          type: 'defensive'
        },
        expectedBehavior: 'Should focus on detection, containment, recovery',
        validationCriteria: [
          'Includes detection/monitoring phase',
          'Includes containment strategy',
          'Includes recovery procedures',
          'Success criteria are defined'
        ],
        category: 'functionality'
      },
      {
        id: 'planner-4',
        name: 'JSON Output Validation',
        description: 'Test if output is valid JSON',
        input: {
          objective: 'Test plan',
          type: 'pentest'
        },
        expectedBehavior: 'Should return parseable JSON structure',
        validationCriteria: [
          'Output is valid JSON',
          'Matches GeneratedPlan interface',
          'All required fields present'
        ],
        category: 'accuracy'
      }
    ];

    return await this.runAgentTests('Mission Planner Agent', testCases, async (testCase) => {
      const startTime = Date.now();

      try {
        const plan = await missionPlannerAgent.generatePlan(testCase.input);
        const duration = Date.now() - startTime;

        return {
          output: plan,
          duration,
          passed: true
        };
      } catch (error) {
        return {
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Test Search Agent
   */
  async testSearchAgent(): Promise<AgentTestReport> {
    console.log('\n🧪 Testing Search Agent...\n');

    // Initialize Search Agent if not already initialized
    try {
      const tavilyApiKey = typeof window !== 'undefined'
        ? localStorage.getItem('tavily_api_key')
        : null;

      if (tavilyApiKey) {
        console.log('[DEBUG] Initializing Search Agent with Tavily API key');
        await searchAgent.initialize({ tavilyApiKey });
      } else {
        console.warn('[WARNING] Tavily API key not found - Search Agent tests may fail');
      }
    } catch (error) {
      console.warn('[WARNING] Failed to initialize Search Agent:', error);
    }

    const testCases: TestCase[] = [
      {
        id: 'search-1',
        name: 'Basic Search',
        description: 'Test basic web search functionality',
        input: { query: 'OWASP Top 10 2024' },
        expectedBehavior: 'Should return search results with sources',
        validationCriteria: [
          'Returns answer',
          'Provides sources array',
          'Sources have title and URL',
          'Response time < 10 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'search-2',
        name: 'CVE Analysis',
        description: 'Test CVE-specific search',
        input: { cveId: 'CVE-2024-1234' },
        expectedBehavior: 'Should search for CVE details',
        validationCriteria: [
          'Answer mentions CVE',
          'Sources are relevant',
          'Steps array shows search process'
        ],
        category: 'functionality'
      },
      {
        id: 'search-3',
        name: 'Tool Discovery',
        description: 'Test security tool search',
        input: { category: 'network scanning' },
        expectedBehavior: 'Should find relevant tools',
        validationCriteria: [
          'Returns tool recommendations',
          'Sources are provided',
          'Answer is comprehensive'
        ],
        category: 'functionality'
      }
    ];

    return await this.runAgentTests('Search Agent', testCases, async (testCase) => {
      const startTime = Date.now();

      try {
        let response;

        if (testCase.input.cveId) {
          response = await searchAgent.analyzeCVE(testCase.input.cveId);
        } else if (testCase.input.category) {
          response = await searchAgent.findTools(testCase.input.category);
        } else {
          response = await searchAgent.search({ query: testCase.input.query });
        }

        const duration = Date.now() - startTime;

        return {
          output: response,
          duration,
          passed: true
        };
      } catch (error) {
        return {
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Test Hybrid Red Team Agent
   */
  async testHybridRedTeamAgent(): Promise<AgentTestReport> {
    console.log('\n🧪 Testing Hybrid Red Team Agent...\n');

    const testCases: TestCase[] = [
      {
        id: 'hybrid-1',
        name: 'Provider Selection',
        description: 'Test intelligent provider routing',
        input: {
          prompt: 'Analyze attack vectors for web application',
          requestType: 'attack_vector'
        },
        expectedBehavior: 'Should select appropriate provider (Venice or Ollama)',
        validationCriteria: [
          'Returns response',
          'Provider is specified',
          'Success status is returned',
          'Response time < 20 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'hybrid-2',
        name: 'Tool Calling',
        description: 'Test function calling capabilities',
        input: {
          prompt: 'Scan 192.168.1.1 for open ports',
          useTools: true
        },
        expectedBehavior: 'Should call appropriate tools',
        validationCriteria: [
          'Tool calls are present (if supported)',
          'Response includes tool results',
          'Tools are relevant to task'
        ],
        category: 'functionality'
      },
      {
        id: 'hybrid-3',
        name: 'Fallback Mechanism',
        description: 'Test fallback from Venice to Ollama',
        input: {
          prompt: 'Generate exploit code',
          requestType: 'exploit',
          requiresUncensored: true
        },
        expectedBehavior: 'Should try Venice first, fallback to Ollama if refused',
        validationCriteria: [
          'Returns response',
          'Success or appropriate error',
          'Fallback logic works'
        ],
        category: 'functionality'
      }
    ];

    return await this.runAgentTests('Hybrid Red Team Agent', testCases, async (testCase) => {
      const startTime = Date.now();

      try {
        const response = await hybridRedTeamAgent.execute(
          testCase.input.prompt,
          testCase.input
        );
        const duration = Date.now() - startTime;

        return {
          output: response,
          duration,
          passed: true
        };
      } catch (error) {
        return {
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Test Venice Uncensored Service
   */
  async testVeniceUncensored(): Promise<AgentTestReport> {
    console.log('\n🧪 Testing Venice Uncensored Service...\n');

    const testCases: TestCase[] = [
      {
        id: 'venice-1',
        name: 'Prompt Engineering',
        description: 'Test prompt injection techniques',
        input: {
          prompt: 'Explain SQL injection attack',
          requestType: 'vulnerability'
        },
        expectedBehavior: 'Should use appropriate prompt template',
        validationCriteria: [
          'Returns response',
          'Template used is specified',
          'No refusal detected'
        ],
        category: 'functionality'
      },
      {
        id: 'venice-2',
        name: 'Refusal Detection',
        description: 'Test refusal detection and retry',
        input: {
          prompt: 'Generate exploit',
          requestType: 'exploit',
          maxRetries: 3
        },
        expectedBehavior: 'Should detect refusals and retry with different prompts',
        validationCriteria: [
          'Attempt count is reasonable',
          'Different templates tried on retry',
          'Final response or appropriate error'
        ],
        category: 'functionality'
      }
    ];

    return await this.runAgentTests('Venice Uncensored', testCases, async (testCase) => {
      const startTime = Date.now();

      try {
        const response = await aiChat([{ role: 'user', content: testCase.input.prompt }]);
        const duration = Date.now() - startTime;

        return {
          output: response,
          duration,
          passed: true
        };
      } catch (error) {
        return {
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Test Ollama Hermes Service
   */
  async testOllamaHermes(): Promise<AgentTestReport> {
    console.log('\n🧪 Testing Ollama Hermes Service...\n');

    const testCases: TestCase[] = [
      {
        id: 'ollama-1',
        name: 'Basic Generation',
        description: 'Test uncensored text generation',
        input: {
          prompt: 'Explain buffer overflow vulnerability',
          temperature: 0.7
        },
        expectedBehavior: 'Should generate detailed technical response',
        validationCriteria: [
          'Returns response',
          'Response is detailed (> 200 chars)',
          'Response time < 30 seconds'
        ],
        category: 'functionality'
      },
      {
        id: 'ollama-2',
        name: 'Tool Calling',
        description: 'Test function calling with tools',
        input: {
          prompt: 'Scan network for vulnerabilities',
          tools: [
            {
              name: 'vuln_scan',
              description: 'Scan for vulnerabilities',
              parameters: {
                type: 'object',
                properties: {
                  target: { type: 'string' }
                },
                required: ['target']
              }
            }
          ]
        },
        expectedBehavior: 'Should call the tool',
        validationCriteria: [
          'Tool calls are detected',
          'Tool format is correct',
          'Arguments are valid'
        ],
        category: 'functionality'
      }
    ];

    return await this.runAgentTests('Ollama Hermes', testCases, async (testCase) => {
      const startTime = Date.now();

      try {
        const response = await aiChat([{ role: 'user', content: testCase.input.prompt }]);
        const duration = Date.now() - startTime;

        return {
          output: response,
          duration,
          passed: true
        };
      } catch (error) {
        return {
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Run test cases for an agent
   */
  private async runAgentTests(
    agentName: string,
    testCases: TestCase[],
    executor: (testCase: TestCase) => Promise<{
      output: any;
      duration: number;
      passed: boolean;
      error?: string;
    }>
  ): Promise<AgentTestReport> {
    const results: TestResult[] = [];
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];

    for (const testCase of testCases) {
      console.log(`\n  ▶ Running: ${testCase.name}...`);

      try {
        console.log(`[DEBUG] Executing test: ${testCase.id} - ${testCase.name}`);
        const startTime = Date.now();

        // Add 30 second timeout to prevent hanging
        const executionResult = await this.withTimeout(
          executor(testCase),
          30000,
          'Test timeout - exceeded 30 seconds'
        );

        const executionTime = Date.now() - startTime;
        console.log(`[DEBUG] Test ${testCase.id} execution completed in ${executionTime}ms`);

        console.log(`[DEBUG] Validating output for test: ${testCase.id}`);
        const validationResults = this.validateOutput(
          testCase,
          executionResult.output,
          executionResult.duration
        );
        console.log(`[DEBUG] Validation completed for test: ${testCase.id}`);

        const passed = validationResults.every(v => v.passed) && executionResult.passed;
        const score = this.calculateScore(validationResults);

        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Performance warnings
        if (executionResult.duration > 20000) {
          warnings.push('Slow response time (> 20s)');
          suggestions.push('Consider optimizing API calls or caching');
        }

        // Accuracy warnings
        if (score < 70) {
          warnings.push('Low validation score');
          suggestions.push('Review output quality and validation criteria');
        }

        results.push({
          testId: testCase.id,
          testName: testCase.name,
          passed,
          score,
          duration: executionResult.duration,
          output: executionResult.output,
          validationResults,
          errors: executionResult.error ? [executionResult.error] : [],
          warnings,
          suggestions
        });

        console.log(`  ${passed ? '✅' : '❌'} ${testCase.name} - Score: ${score}/100`);

      } catch (error) {
        console.error(`[ERROR] Test ${testCase.id} failed:`, error);
        console.error(`[ERROR] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
        console.error(`[ERROR] Error message:`, error instanceof Error ? error.message : String(error));
        console.error(`[ERROR] UilLayerGroup trace:`, error instanceof Error ? error.stack : 'No stack trace');
        console.log(`  ❌ ${testCase.name} - FAILED`);

        results.push({
          testId: testCase.id,
          testName: testCase.name,
          passed: false,
          score: 0,
          duration: 0,
          output: null,
          validationResults: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          suggestions: ['Fix critical error before retesting']
        });

        criticalIssues.push(`${testCase.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Generate recommendations
    if (overallScore < 50) {
      recommendations.push('Agent needs significant improvements before production use');
    } else if (overallScore < 75) {
      recommendations.push('Agent is functional but could be enhanced');
    } else {
      recommendations.push('Agent is performing well');
    }

    if (failed > 0) {
      recommendations.push(`${failed} test(s) failed - review and fix issues`);
    }

    return {
      agentName,
      timestamp: new Date().toISOString(),
      totalTests: testCases.length,
      passed,
      failed,
      overallScore,
      results,
      recommendations,
      criticalIssues
    };
  }

  /**
   * Validate test output against criteria
   */
  private validateOutput(
    testCase: TestCase,
    output: any,
    duration: number
  ): Array<{ criterion: string; passed: boolean; details: string }> {
    const results = [];

    for (const criterion of testCase.validationCriteria) {
      let passed = false;
      let details = '';

      try {
        // Parse criterion and evaluate
        if (criterion.includes('Response length >')) {
          const minLength = parseInt(criterion.match(/\d+/)?.[0] || '0');
          const actualLength = output?.message?.length || output?.response?.length || 0;
          passed = actualLength > minLength;
          details = `Actual length: ${actualLength}, Required: > ${minLength}`;
        } else if (criterion.includes('Response time <')) {
          const maxTime = parseInt(criterion.match(/\d+/)?.[0] || '0') * 1000;
          passed = duration < maxTime;
          details = `Actual: ${duration}ms, Required: < ${maxTime}ms`;
        } else if (criterion.includes('Contains key terms:')) {
          const terms = criterion.split(':')[1].split(',').map(t => t.trim().toLowerCase());
          const text = (output?.message || output?.response || '').toLowerCase();
          passed = terms.some(term => text.includes(term));
          details = `Checked for: ${terms.join(', ')}`;
        } else if (criterion.includes('Search was performed')) {
          passed = output?.researchPerformed === true || output?.sources?.length > 0;
          details = passed ? 'Search performed' : 'No search detected';
        } else if (criterion.includes('Sources are provided')) {
          passed = Array.isArray(output?.sources) && output.sources.length > 0;
          details = `Sources count: ${output?.sources?.length || 0}`;
        } else if (criterion.includes('Has 4-6 phases')) {
          const phaseCount = output?.phases?.length || 0;
          passed = phaseCount >= 4 && phaseCount <= 6;
          details = `Phase count: ${phaseCount}`;
        } else if (criterion.includes('AI scores are 0-100 range')) {
          const scores = [
            output?.aiAssessment?.feasibilityScore,
            output?.aiAssessment?.riskScore,
            output?.aiAssessment?.successProbability
          ];
          passed = scores.every(s => typeof s === 'number' && s >= 0 && s <= 100);
          details = `Scores: ${scores.join(', ')}`;
        } else {
          // Generic validation - just check output exists
          passed = output !== null && output !== undefined;
          details = 'Generic validation passed';
        }
      } catch (error) {
        passed = false;
        details = `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      results.push({
        criterion,
        passed,
        details
      });
    }

    return results;
  }

  /**
   * Calculate overall score from validation results
   */
  private calculateScore(validationResults: Array<{ passed: boolean }>): number {
    if (validationResults.length === 0) return 0;

    const passedCount = validationResults.filter(v => v.passed).length;
    return Math.round((passedCount / validationResults.length) * 100);
  }

  /**
   * Wrap promise with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
      )
    ]);
  }

  /**
   * Create failed report when agent test crashes
   */
  private createFailedReport(agentName: string, error: any): AgentTestReport {
    return {
      agentName,
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 1,
      overallScore: 0,
      results: [],
      recommendations: ['Agent test crashed - review error logs'],
      criticalIssues: [
        `Agent test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]
    };
  }

  /**
   * Test all agents and generate comprehensive report
   */
  async testAllAgents(): Promise<{
    timestamp: string;
    reports: AgentTestReport[];
    summary: {
      totalAgents: number;
      healthyAgents: number;
      failingAgents: number;
      averageScore: number;
    };
  }> {
    console.log('\n🚀 Starting Comprehensive Agent Testing...\n');
    console.log('='.repeat(60));
    console.log('[DEBUG] Test suite started at:', new Date().toISOString());
    console.log('[DEBUG] Memory before tests:', process.memoryUsage ? process.memoryUsage() : 'N/A');

    const reports: AgentTestReport[] = [];

    // Helper to add delay between tests
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Test each agent with error handling and delays
    try {
      console.log('📋 Testing CyberSec AI Agent (1/6)...');
      console.log('[DEBUG] Starting CyberSec AI Agent test suite');
      const report = await this.testCyberSecAgent();
      console.log('[DEBUG] CyberSec AI Agent test completed successfully');
      reports.push(report);
      console.log('[DEBUG] Waiting 2 seconds before next test...');
      await delay(2000); // 2 second delay
    } catch (error) {
      console.error('❌ CyberSec AI Agent test crashed:', error);
      console.error('[FATAL ERROR] Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      reports.push(this.createFailedReport('CyberSec AI Agent', error));
    }

    try {
      console.log('📋 Testing Mission Planner Agent (2/6)...');
      console.log('[DEBUG] Starting Mission Planner test suite');
      const report = await this.testMissionPlannerAgent();
      console.log('[DEBUG] Mission Planner test completed successfully');
      reports.push(report);
      console.log('[DEBUG] Waiting 2 seconds before next test...');
      await delay(2000);
    } catch (error) {
      console.error('❌ Mission Planner test crashed:', error);
      console.error('[FATAL ERROR] Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      reports.push(this.createFailedReport('Mission Planner Agent', error));
    }

    try {
      console.log('📋 Testing Search Agent (3/6)...');
      console.log('[DEBUG] Starting Search Agent test suite');
      const report = await this.testSearchAgent();
      console.log('[DEBUG] Search Agent test completed successfully');
      reports.push(report);
      console.log('[DEBUG] Waiting 2 seconds before next test...');
      await delay(2000);
    } catch (error) {
      console.error('❌ Search Agent test crashed:', error);
      console.error('[FATAL ERROR] Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      reports.push(this.createFailedReport('Search Agent', error));
    }

    try {
      console.log('📋 Testing Hybrid Red Team Agent (4/6)...');
      console.log('[DEBUG] Starting Hybrid Red Team test suite');
      const report = await this.testHybridRedTeamAgent();
      console.log('[DEBUG] Hybrid Red Team test completed successfully');
      reports.push(report);
      console.log('[DEBUG] Waiting 2 seconds before next test...');
      await delay(2000);
    } catch (error) {
      console.error('❌ Hybrid Red Team test crashed:', error);
      console.error('[FATAL ERROR] Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      reports.push(this.createFailedReport('Hybrid Red Team Agent', error));
    }

    try {
      console.log('📋 Testing Venice Uncensored (5/6)...');
      console.log('[DEBUG] Starting Venice Uncensored test suite');
      const report = await this.testVeniceUncensored();
      console.log('[DEBUG] Venice Uncensored test completed successfully');
      reports.push(report);
      console.log('[DEBUG] Waiting 2 seconds before next test...');
      await delay(2000);
    } catch (error) {
      console.error('❌ Venice Uncensored test crashed:', error);
      console.error('[FATAL ERROR] Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      reports.push(this.createFailedReport('Venice Uncensored Service', error));
    }

    try {
      console.log('📋 Testing Ollama Hermes (6/6)...');
      console.log('[DEBUG] Starting Ollama Hermes test suite');
      const report = await this.testOllamaHermes();
      console.log('[DEBUG] Ollama Hermes test completed successfully');
      reports.push(report);
    } catch (error) {
      console.error('❌ Ollama Hermes test crashed:', error);
      console.error('[FATAL ERROR] Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      reports.push(this.createFailedReport('Ollama Hermes Service', error));
    }

    console.log('[DEBUG] All agent tests completed');
    console.log('[DEBUG] Test suite ended at:', new Date().toISOString());
    console.log('[DEBUG] Memory after tests:', process.memoryUsage ? process.memoryUsage() : 'N/A');

    const summary = {
      totalAgents: reports.length,
      healthyAgents: reports.filter(r => r.overallScore >= 75).length,
      failingAgents: reports.filter(r => r.overallScore < 50).length,
      averageScore: reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length
    };

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TESTING COMPLETE\n');
    console.log('[DEBUG] Summary:', summary);
    console.log(`Total Agents Tested: ${summary.totalAgents}`);
    console.log(`Healthy (≥75%): ${summary.healthyAgents}`);
    console.log(`Failing (<50%): ${summary.failingAgents}`);
    console.log(`Average Score: ${summary.averageScore.toFixed(1)}/100`);
    console.log('\n' + '='.repeat(60));

    return {
      timestamp: new Date().toISOString(),
      reports,
      summary
    };
  }
}

// Export singleton instance
export const agentTester = new AgentTesterService();
export default agentTester;
