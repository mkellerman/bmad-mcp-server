/**
 * Unit tests for FileReader
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  FileReader,
  FileReadError,
  PathTraversalError,
} from '../../src/utils/file-reader.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentFile,
  SAMPLE_AGENT,
  type TestFixture,
} from '../helpers/test-fixtures.js';
import fs from 'node:fs';
import path from 'node:path';

describe('FileReader', () => {
  let fixture: TestFixture;
  let reader: FileReader;

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);
    reader = new FileReader(fixture.tmpDir);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with valid BMAD root', () => {
      expect(reader).toBeDefined();
    });

    it('should resolve relative paths to absolute', () => {
      const relativeReader = new FileReader('./');
      expect(relativeReader).toBeDefined();
    });

    it('should warn if BMAD root does not exist', () => {
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const nonExistentPath = path.join(fixture.tmpDir, 'nonexistent');
      new FileReader(nonExistentPath);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('BMAD root directory not found'),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('readFile', () => {
    it('should read file with absolute path', () => {
      const testFile = path.join(fixture.tmpDir, 'src', 'bmad', 'test.txt');
      fs.writeFileSync(testFile, 'Hello World', 'utf-8');

      const content = reader.readFile(testFile);
      expect(content).toBe('Hello World');
    });

    it('should read file with relative path', () => {
      const relativePath = 'src/bmad/bmm/agents/test.md';
      createAgentFile(fixture.tmpDir, 'bmm/agents/test.md', SAMPLE_AGENT);

      const content = reader.readFile(relativePath);
      expect(content).toContain('Test Agent');
    });

    it('should throw FileReadError if file does not exist', () => {
      expect(() => {
        reader.readFile('src/bmad/nonexistent.txt');
      }).toThrow(FileReadError);
    });

    it('should throw PathTraversalError for path traversal attempts', () => {
      expect(() => {
        reader.readFile('../../../etc/passwd');
      }).toThrow(PathTraversalError);
    });

    it('should throw PathTraversalError for absolute paths outside BMAD root', () => {
      expect(() => {
        reader.readFile('/etc/passwd');
      }).toThrow(PathTraversalError);
    });

    it('should handle symlinks safely', () => {
      const targetFile = path.join(fixture.tmpDir, 'src', 'bmad', 'target.txt');
      fs.writeFileSync(targetFile, 'Target content', 'utf-8');

      const linkFile = path.join(fixture.tmpDir, 'src', 'bmad', 'link.txt');
      fs.symlinkSync(targetFile, linkFile);

      const content = reader.readFile('src/bmad/link.txt');
      expect(content).toBe('Target content');
    });

    it('should log successful reads', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const testFile = path.join(fixture.tmpDir, 'src', 'bmad', 'test.txt');
      fs.writeFileSync(testFile, 'Test', 'utf-8');

      reader.readFile(testFile);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Read 4 bytes from'),
      );
      consoleSpy.mockRestore();
    });

    it('should handle permission errors', () => {
      const testFile = path.join(
        fixture.tmpDir,
        'src',
        'bmad',
        'restricted.txt',
      );
      fs.writeFileSync(testFile, 'Secret', 'utf-8');
      fs.chmodSync(testFile, 0o000);

      try {
        expect(() => {
          reader.readFile(testFile);
        }).toThrow(FileReadError);
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(testFile, 0o644);
      }
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const testFile = path.join(fixture.tmpDir, 'src', 'bmad', 'exists.txt');
      fs.writeFileSync(testFile, 'Exists', 'utf-8');

      expect(reader.fileExists(testFile)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(reader.fileExists('src/bmad/nonexistent.txt')).toBe(false);
    });

    it('should return false for files outside BMAD root', () => {
      expect(reader.fileExists('/etc/passwd')).toBe(false);
    });

    it('should return false for path traversal attempts', () => {
      expect(reader.fileExists('../../../etc/passwd')).toBe(false);
    });

    it('should work with relative paths', () => {
      createAgentFile(fixture.tmpDir, 'bmm/agents/test.md', SAMPLE_AGENT);
      expect(reader.fileExists('src/bmad/bmm/agents/test.md')).toBe(true);
    });
  });

  describe('path validation', () => {
    it('should allow files in BMAD subdirectories', () => {
      const testFile = path.join(
        fixture.tmpDir,
        'src',
        'bmad',
        'deep',
        'nested',
        'file.txt',
      );
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, 'Deep file', 'utf-8');

      const content = reader.readFile('src/bmad/deep/nested/file.txt');
      expect(content).toBe('Deep file');
    });

    it('should block access to parent directories', () => {
      expect(() => {
        reader.readFile('..');
      }).toThrow(PathTraversalError);
    });

    it('should handle . and .. in paths correctly', () => {
      const testFile = path.join(fixture.tmpDir, 'src', 'bmad', 'test.txt');
      fs.writeFileSync(testFile, 'Test', 'utf-8');

      const content = reader.readFile('src/bmad/./test.txt');
      expect(content).toBe('Test');
    });
  });
});
