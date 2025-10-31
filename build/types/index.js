// This file defines TypeScript interfaces and types used throughout the application for type safety.
/**
 * Result of input validation
 */
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["TOO_MANY_ARGUMENTS"] = "TOO_MANY_ARGUMENTS";
    ErrorCode["INVALID_ASTERISK_COUNT"] = "INVALID_ASTERISK_COUNT";
    ErrorCode["MISSING_WORKFLOW_NAME"] = "MISSING_WORKFLOW_NAME";
    ErrorCode["MISSING_ASTERISK"] = "MISSING_ASTERISK";
    ErrorCode["INVALID_CHARACTERS"] = "INVALID_CHARACTERS";
    ErrorCode["NON_ASCII_CHARACTERS"] = "NON_ASCII_CHARACTERS";
    ErrorCode["NAME_TOO_SHORT"] = "NAME_TOO_SHORT";
    ErrorCode["NAME_TOO_LONG"] = "NAME_TOO_LONG";
    ErrorCode["INVALID_NAME_FORMAT"] = "INVALID_NAME_FORMAT";
    ErrorCode["UNKNOWN_WORKFLOW"] = "UNKNOWN_WORKFLOW";
    ErrorCode["CASE_MISMATCH"] = "CASE_MISMATCH";
    ErrorCode["UNKNOWN_AGENT"] = "UNKNOWN_AGENT";
})(ErrorCode || (ErrorCode = {}));
//# sourceMappingURL=index.js.map