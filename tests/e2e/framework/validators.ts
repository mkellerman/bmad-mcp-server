/* eslint-disable no-unused-vars */
import { Expectation } from './yaml-loader';
import { LLMClient } from './llm-client';

/**
 * Validation result
 */
export interface ValidationResult {
  pass: boolean;
  message: string;
  details?: any;
}

/**
 * Base validator interface
 */
export interface Validator {
  validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult>;
}

/**
 * Contains Validator
 * Checks if response contains a specific string
 */
export class ContainsValidator implements Validator {
  async validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult> {
    const value = expectation.value || '';
    const caseSensitive = expectation.case_sensitive ?? false;

    const responseToCheck = caseSensitive ? response : response.toLowerCase();
    const valueToCheck = caseSensitive ? value : value.toLowerCase();

    const pass = responseToCheck.includes(valueToCheck);

    return {
      pass,
      message: pass
        ? `Response contains "${value}"`
        : `Response does not contain "${value}"`,
    };
  }
}

/**
 * Not Contains Validator
 * Checks if response does NOT contain a specific string
 */
export class NotContainsValidator implements Validator {
  async validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult> {
    const value = expectation.value || '';
    const caseSensitive = expectation.case_sensitive ?? false;

    const responseToCheck = caseSensitive ? response : response.toLowerCase();
    const valueToCheck = caseSensitive ? value : value.toLowerCase();

    const pass = !responseToCheck.includes(valueToCheck);

    return {
      pass,
      message: pass
        ? `Response does not contain "${value}"`
        : `Response should not contain "${value}"`,
    };
  }
}

/**
 * Regex Validator
 * Checks if response matches a regex pattern
 */
export class RegexValidator implements Validator {
  async validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult> {
    const pattern = new RegExp(expectation.pattern || '', 'i');
    const pass = pattern.test(response);

    return {
      pass,
      message: pass
        ? `Response matches pattern /${expectation.pattern}/`
        : `Response does not match pattern /${expectation.pattern}/`,
    };
  }
}

/**
 * Response Length Validator
 * Checks if response length is within specified range
 */
export class ResponseLengthValidator implements Validator {
  async validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult> {
    const length = response.length;
    const min = expectation.min ?? 0;
    const max = expectation.max ?? Infinity;

    const pass = length >= min && length <= max;

    return {
      pass,
      message: pass
        ? `Response length (${length}) is within range [${min}, ${max}]`
        : `Response length (${length}) is outside range [${min}, ${max}]`,
      details: { length, min, max },
    };
  }
}

/**
 * LLM Judge Validator
 * Uses an LLM to evaluate response quality against criteria
 */
export class LLMJudgeValidator implements Validator {
  constructor(
    private _llmClient: LLMClient,
    private _judgeModel: string = 'claude-3-5-sonnet',
  ) {}

  async validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult> {
    const criteria = expectation.criteria || '';
    const threshold = expectation.threshold ?? 0.8;

    const judgePrompt = `You are an expert evaluator. Analyze the following AI response against the given criteria.

**Response to evaluate:**
${response}

**Evaluation criteria:**
${criteria}

**Instructions:**
1. Evaluate if the response meets ALL the criteria listed
2. Provide a confidence score from 0.0 to 1.0 (where 1.0 means perfect match)
3. Explain your reasoning clearly

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "passes": true,
  "confidence": 0.95,
  "reasoning": "The response clearly introduces Mary as the Business Analyst and provides a numbered menu with appropriate workflow options."
}`;

    try {
      const completion = await this._llmClient.chat(
        this._judgeModel,
        [{ role: 'user', content: judgePrompt }],
        { temperature: 0.1, max_tokens: 500 },
      );

      const responseText = this._llmClient.getResponseText(completion);

      // Try to parse JSON response
      let judgment: any;
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        judgment = JSON.parse(cleanedResponse);
      } catch (parseError) {
        return {
          pass: false,
          message: `LLM Judge returned invalid JSON: ${responseText}`,
          details: { error: parseError },
        };
      }

      const pass = judgment.passes && judgment.confidence >= threshold;

      return {
        pass,
        message: pass
          ? `LLM Judge: PASS (confidence: ${judgment.confidence})`
          : `LLM Judge: FAIL (confidence: ${judgment.confidence}, threshold: ${threshold})`,
        details: {
          confidence: judgment.confidence,
          threshold,
          reasoning: judgment.reasoning,
        },
      };
    } catch (error) {
      return {
        pass: false,
        message: `LLM Judge error: ${error}`,
        details: { error },
      };
    }
  }
}

/**
 * Validator Registry
 * Manages all available validators
 */
export class ValidatorRegistry {
  private validators: Map<string, Validator>;

  constructor(llmClient: LLMClient, judgeModel?: string) {
    this.validators = new Map();
    this.validators.set('contains', new ContainsValidator());
    this.validators.set('not_contains', new NotContainsValidator());
    this.validators.set('regex', new RegexValidator());
    this.validators.set('response_length', new ResponseLengthValidator());
    this.validators.set(
      'llm_judge',
      new LLMJudgeValidator(llmClient, judgeModel),
    );
  }

  get(type: string): Validator {
    const validator = this.validators.get(type);
    if (!validator) {
      throw new Error(`Unknown validator type: ${type}`);
    }
    return validator;
  }

  async validate(
    response: string,
    expectation: Expectation,
  ): Promise<ValidationResult> {
    const validator = this.get(expectation.type);
    return await validator.validate(response, expectation);
  }
}
