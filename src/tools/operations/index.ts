/**
 * BMAD Tool Operations
 *
 * Modular operation handlers for the unified BMAD tool.
 * Each operation is in its own file for clarity and testability.
 */

// List operation
export {
  type ListParams,
  executeListOperation,
  validateListParams,
  getListExamples,
} from './list.js';

// Search operation
export {
  type SearchParams,
  executeSearchOperation,
  validateSearchParams,
  getSearchExamples,
} from './search.js';

// Read operation
export {
  type ReadParams,
  executeReadOperation,
  validateReadParams,
  getReadExamples,
} from './read.js';

// Execute operation
export {
  type ExecuteOperationParams,
  executeExecuteOperation,
  validateExecuteParams,
  getExecuteExamples,
} from './execute.js';
