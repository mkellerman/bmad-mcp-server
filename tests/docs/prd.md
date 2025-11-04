# BMAD Unified Testing Framework - Product Requirements Document

## 📋 Executive Summary

**Product:** Unified Testing Framework for BMAD MCP Server  
**Version:** 1.0  
**Status:** In Development  
**Date:** November 3, 2025

### Purpose

Create a single, cohesive testing framework that handles all test types (unit, integration, E2E, LLM, agent validation) and produces a beautiful, standalone HTML report.

### Goals

1. **Unified Reporting** - One HTML report for all test types
2. **Developer Experience** - Easy to write tests, easy to debug failures
3. **LLM-Aware** - Track prompts, responses, XML validation
4. **Interactive Testing** - Quick prompt testing via CLI
5. **Offline-First** - HTML reports work without server

---

## 🎯 Problem Statement

### Current Issues

- ❌ Multiple test frameworks with inconsistent reporting
- ❌ Vitest HTML reporter requires server to view
- ❌ No unified view of all test results
- ❌ LLM interactions not tracked or logged properly
- ❌ XML instruction/content separation not validated
- ❌ No easy way to test prompts interactively

### User Pain Points

1. **Developers** can't quickly test a prompt without writing full test file
2. **QA** can't easily see all test results in one place
3. **CI/CD** gets multiple JSON outputs instead of one
4. **Debugging** requires hunting through multiple log files

---

## 👥 User Stories

### US-1: Developer Testing

**As a** developer  
**I want to** test a prompt quickly  
**So that** I can validate LLM behavior without writing test files

**Acceptance Criteria:**

- Can run `npm run test:prompt -- "my prompt"`
- Receives JSON output with full interaction trace
- Can save results for later comparison
- Can validate XML formatting

### US-2: QA Validation

**As a** QA engineer  
**I want to** see all test results in one HTML report  
**So that** I can understand system health at a glance

**Acceptance Criteria:**

- Single HTML file shows all test types
- Can filter by test type, status, duration
- Can expand/collapse test suites
- Shows LLM interactions inline
- Links to agent logs

### US-3: CI/CD Integration

**As a** CI/CD pipeline  
**I want to** get structured test results  
**So that** I can report pass/fail status and metrics

**Acceptance Criteria:**

- JSON output with all test results
- Exit codes reflect test status
- Results include timing and coverage
- Can trend over time

### US-4: Test Author

**As a** test author  
**I want to** write tests using a unified framework  
**So that** my tests work the same way regardless of type

**Acceptance Criteria:**

- Single API for all test types
- Helper utilities for common patterns
- XML validation built-in
- Agent logging automatic

---

## 🏗️ Functional Requirements

### FR-1: Test Result Data Model

- **FR-1.1**: Support all test types (unit, integration, e2e, llm, agent)
- **FR-1.2**: Capture test metadata (name, suite, duration, status)
- **FR-1.3**: Track LLM interactions (prompt, response, tool calls)
- **FR-1.4**: Validate XML structure (instructions/content separation)
- **FR-1.5**: Link to agent logs

### FR-2: Unified Reporter

- **FR-2.1**: Implement Vitest custom reporter interface
- **FR-2.2**: Collect test results in memory during run
- **FR-2.3**: Generate standalone HTML on completion
- **FR-2.4**: Generate JSON for programmatic access
- **FR-2.5**: Support all test types uniformly

### FR-3: HTML Report Generator

- **FR-3.1**: Create standalone HTML (no external dependencies)
- **FR-3.2**: Show test type badges (Unit, Integration, E2E, LLM)
- **FR-3.3**: Provide search and filter functionality
- **FR-3.4**: Display LLM interactions inline
- **FR-3.5**: Link to agent log files
- **FR-3.6**: Show XML validation results
- **FR-3.7**: Display performance metrics
- **FR-3.8**: Show failure details with stack traces

### FR-4: Interactive Prompt Tool

- **FR-4.1**: Accept prompt via CLI argument
- **FR-4.2**: Connect to MCP server
- **FR-4.3**: Send prompt to LLM with bmad tool access
- **FR-4.4**: Capture full interaction trace
- **FR-4.5**: Output JSON by default
- **FR-4.6**: Support text and XML output formats
- **FR-4.7**: Save results with timestamp
- **FR-4.8**: Validate XML structure

### FR-5: Test Helpers

- **FR-5.1**: LLM interaction helper (send, receive, validate)
- **FR-5.2**: MCP client wrapper (connect, call, cleanup)
- **FR-5.3**: XML validator (check tags, detect leakage)
- **FR-5.4**: Agent logger (write, link, format)
- **FR-5.5**: Test builder (fluent API for test creation)

---

## 🎨 Non-Functional Requirements

### NFR-1: Performance

- HTML report generation < 2 seconds for 1000 tests
- Prompt tool response < 5 seconds
- Test execution overhead < 10%

### NFR-2: Usability

- HTML report works offline
- Zero configuration for basic usage
- Clear error messages
- Intuitive navigation

### NFR-3: Compatibility

- Works with Vitest
- Supports TypeScript
- Compatible with existing tests
- Works on macOS, Linux, Windows

### NFR-4: Maintainability

- Well-documented code
- Type-safe interfaces
- Modular architecture
- Clear separation of concerns

---

## 📊 Success Metrics

### Quantitative

- **100%** of tests produce unified report
- **< 2s** HTML generation time
- **< 5s** prompt tool response
- **0** external dependencies in HTML

### Qualitative

- Developers prefer new framework
- QA finds reports helpful
- CI/CD integration seamless
- Test authoring easier

---

## 🚀 Release Plan

### Phase 1: Core Framework (Week 1)

- ✅ Data model
- ✅ Reporter infrastructure
- ✅ HTML generator
- ✅ Basic helpers

### Phase 2: Advanced Features (Week 2)

- ✅ Prompt testing tool
- ✅ XML validation
- ✅ Agent logging
- ✅ Search/filter UI

### Phase 3: Migration (Week 3)

- ✅ Example tests
- ✅ Documentation
- ✅ Migration guide
- ✅ Update existing tests

### Phase 4: Polish (Week 4)

- ✅ Performance optimization
- ✅ Error handling
- ✅ Edge cases
- ✅ User feedback

---

## 🔄 Future Enhancements

### V2.0 Considerations

- Visual regression testing
- Code coverage integration
- Performance trending
- AI-powered test generation
- Browser-based test runner
- Real-time collaboration

---

## 📝 Appendix

### Glossary

- **Unit Test**: Tests individual functions/classes in isolation
- **Integration Test**: Tests multiple components working together
- **E2E Test**: Tests complete user workflows
- **LLM Test**: Tests involving language model interactions
- **Agent Test**: Tests validating BMAD agent behavior
- **XML Validation**: Verifying `<instructions>` and `<content>` tags

### References

- Vitest Reporter API: https://vitest.dev/guide/reporters.html
- MCP Protocol: https://modelcontextprotocol.io/
- BMAD Methodology: Internal documentation
