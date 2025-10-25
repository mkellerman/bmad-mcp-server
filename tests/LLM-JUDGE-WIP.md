# LLM Judge Validation - Work in Progress

## Status: 🚧 NOT READY FOR USE

The LLM Judge validation feature is currently disabled and under development.

## What is LLM Judge?

LLM Judge is an advanced validation type that uses a second LLM to evaluate the quality of test responses. Instead of simple string matching, it evaluates responses based on criteria like:

- Coherence and relevance
- Tone and professionalism
- Completeness of information
- Contextual appropriateness

## Current Issues

### 1. **Threshold Calibration Problems**
- **Issue**: LLM judge confidence scores are inconsistent and unpredictable
- **Example**: A perfectly valid response like "bmad tea" scored 0.1/1.0 confidence
- **Root Cause**: The judge LLM interprets criteria too strictly or differently than expected
- **Impact**: Tests fail even when responses are functionally correct

### 2. **Criteria Too Specific**
- **Issue**: Multi-point criteria (e.g., "must do 1, 2, 3, and 4") often fail partially
- **Example**: 
  ```yaml
  criteria: |
    The response should:
    1. List multiple BMAD agents (at least 5)
    2. Include agent names and roles/descriptions
    3. Be well-formatted and easy to read
    4. Provide guidance on how to load an agent
  threshold: 0.75
  ```
- **Result**: Response listed agents but didn't explain how to load them → Failed at 0.5 confidence
- **Root Cause**: LLM responses are naturally concise; detailed criteria punish brevity

### 3. **Judge Model Limitations**
- **Issue**: Using same model (gpt-4.1) for both test execution and judging
- **Problem**: No diversity in evaluation perspective
- **Attempted**: Using gpt-4-turbo as judge → Model not supported by GitHub Copilot
- **Impact**: Limited evaluation capability, potential bias

### 4. **Response Variance**
- **Issue**: LLMs are non-deterministic; same prompt can yield different responses
- **Example**: 
  - Run 1: "bmad analyst" → Brief, correct
  - Run 2: "Loading the Business Analyst agent..." → Verbose, also correct
- **Impact**: Judge may score these differently even though both are valid
- **Root Cause**: Temperature > 0, inherent LLM randomness

### 5. **Scoring Algorithm Unclear**
- **Issue**: No visibility into how confidence scores are calculated
- **Example**: Judge returns 0.7 but doesn't explain why not 0.8
- **Problem**: Hard to tune criteria when scoring logic is opaque
- **Needed**: More detailed reasoning in judge responses

## Examples of Failures

### Test: Load Test Architect Agent
```yaml
Response: "bmad tea"
Criteria: "Should show intent to load 'tea' test architect agent"
Threshold: 0.7
Result: FAIL (confidence: 0.1)
Reasoning: "Appears to be a typo or unrelated text"
```
**Issue**: Judge didn't understand that "bmad tea" is the correct command format

### Test: List All Available Workflows  
```yaml
Response: "Here are the BMAD workflows: preprocess, align, ..."
Criteria: "1. List workflows 2. Explain descriptions 3. Show how to execute"
Threshold: 0.7
Result: FAIL (confidence: 0.7, exactly at threshold)
Reasoning: "Lists workflows but doesn't explain how to execute them"
```
**Issue**: Criteria too demanding for simple listing operation

### Test: Malformed Command
```yaml
Response: "bmad does a little dance, spins around..."  
Criteria: "Handle invalid command gracefully, suggest correct format"
Threshold: 0.65
Result: FAIL (confidence: 0.3)
Reasoning: "Pretends to execute command without indicating it's invalid"
```
**Issue**: LLM being creative/humorous instead of strict error handling

## What Works Well

### Simple Validators (Currently Used)
These validators are **reliable and fast**:

1. **Contains** - String matching with case sensitivity option
   ```yaml
   - type: "contains"
     value: "analyst"
     case_sensitive: false
   ```

2. **Not Contains** - Ensure certain text is absent
   ```yaml
   - type: "not_contains"
     value: "error"
     case_sensitive: false
   ```

3. **Regex** - Pattern matching for structured responses
   ```yaml
   - type: "regex"
     pattern: "bmad (analyst|tea|architect)"
   ```

4. **Response Length** - Sanity check on response size
   ```yaml
   - type: "response_length"
     min: 10
     max: 500
   ```

## Proposed Solutions

### Option 1: Simplify Criteria (Recommended for v1)
- Use single-sentence criteria
- Focus on binary outcomes (yes/no questions)
- Lower thresholds to 0.5-0.6 range
- Example:
  ```yaml
  criteria: "Does the response show intent to load an agent?"
  threshold: 0.5
  ```

### Option 2: Use Different Judge Model
- Try Claude 3.5 Sonnet (more analytical)
- Use OpenAI GPT-4 directly (not through Copilot)
- Would require alternative authentication setup

### Option 3: Structured Judging Prompts
- Ask judge to score each criterion separately
- Return JSON with detailed breakdown
- Calculate composite score from sub-scores
- Example response:
  ```json
  {
    "relevance": 0.9,
    "completeness": 0.6,
    "tone": 0.8,
    "overall": 0.77
  }
  ```

### Option 4: Human-in-Loop Calibration
- Run tests with LLM judge disabled
- Review actual responses manually
- Adjust criteria based on real output patterns
- Build confidence score benchmarks from real data

### Option 5: Fuzzy Matching + LLM Combination
- Use simple validators for hard requirements
- Use LLM judge only for soft quality checks
- Require both to pass (AND logic)
- Example:
  ```yaml
  expectations:
    - type: "contains"  # MUST contain "analyst"
      value: "analyst"
    - type: "llm_judge"  # NICE if it's well-formatted
      criteria: "Response is clear and professional"
      threshold: 0.5
      optional: true  # Don't fail test if this fails
  ```

## Next Steps

1. **Collect Data**
   - Run tests without LLM judge
   - Save actual LLM responses
   - Analyze patterns in output

2. **Tune Criteria**
   - Rewrite criteria to match actual behavior
   - Use more generic wording
   - Lower thresholds

3. **Experiment with Models**
   - Try different judge models
   - Compare scoring consistency
   - Document which models work best

4. **Build Confidence Benchmarks**
   - What does 0.5 actually mean?
   - What does 0.8 actually mean?
   - Create reference examples

5. **Iterate on Validator Design**
   - Consider hybrid approaches
   - Maybe LLM judge is better for specific use cases only
   - Keep simple validators for most tests

## Disabled Test Locations

LLM judge validators are commented out with `# TODO: LLM Judge validation - Work in Progress` in:

- `tests/e2e/test-cases/agent-loading.yaml` (1 instance)
- `tests/e2e/test-cases/discovery-commands.yaml` (1 instance)  
- `tests/e2e/test-cases/error-handling.yaml` (3 instances)

## Current Test Results (Without LLM Judge)

- **Total Tests**: 9
- **Passing**: 9/9 ✅
- **Failing**: 0
- **Disabled**: 5 LLM judge validations
- **Test Duration**: ~16 seconds
- **Status**: All tests pass with simple validators (contains, not_contains, response_length)

## Contact

To re-enable and improve LLM judge:
1. Review this document
2. Read actual test output in `playwright-report/`
3. Experiment with criteria/thresholds
4. Update this document with findings
