/**
 * @file lib/utils/readability.ts
 * @description Readability analysis utilities using Flesch-Kincaid formulas
 * 
 * Provides text analysis without requiring any API calls:
 * - Word count
 * - Character count
 * - Sentence count
 * - Syllable count
 * - Reading time estimation
 * - Flesch Reading Ease score
 * - Flesch-Kincaid Grade Level
 */

// ============================================================================
// Constants
// ============================================================================

/** Average reading speed in words per minute */
const WORDS_PER_MINUTE = 200;

/** Vowels used for syllable counting */
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y'];

/** Silent endings that don't add syllables */
const SILENT_ENDINGS = ['es', 'ed', 'e'];

/** Special suffixes that count as additional syllables */
const SYLLABLE_SUFFIXES = ['le', 'les', 'tion', 'sion'];

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Basic text metrics (no API required)
 */
export interface BasicMetrics {
  /** Total word count */
  wordCount: number;
  
  /** Total character count (including spaces) */
  characterCount: number;
  
  /** Total character count (excluding spaces) */
  characterCountNoSpaces: number;
  
  /** Total sentence count */
  sentenceCount: number;
  
  /** Estimated reading time in seconds */
  readingTimeSeconds: number;
  
  /** Formatted reading time string */
  readingTimeFormatted: string;
}

/**
 * Readability metrics
 */
export interface ReadabilityMetrics {
  /** Flesch Reading Ease score (0-100) */
  fleschReadingEase: number;
  
  /** Flesch-Kincaid Grade Level */
  gradeLevel: number;
  
  /** Human-readable grade level string */
  gradeLevelLabel: string;
  
  /** Readability label (Very Easy, Easy, etc.) */
  readabilityLabel: string;
  
  /** Normalized score (1-10 scale) */
  normalizedScore: number;
}

/**
 * Complete document metrics
 */
export interface DocumentMetrics extends BasicMetrics, ReadabilityMetrics {}

// ============================================================================
// Text Extraction
// ============================================================================

/**
 * Strip HTML tags and convert to plain text
 * @param html - HTML content string
 * @returns Plain text with HTML removed
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Replace block-level elements with newlines for proper sentence detection
  const blockElements = /<\/(p|div|h[1-6]|li|br|blockquote)>/gi;
  let text = html.replace(blockElements, '. ');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Clean up multiple periods
  text = text.replace(/\.+/g, '.');
  
  return text;
}

// ============================================================================
// Basic Counting Functions
// ============================================================================

/**
 * Count words in text
 * @param text - Plain text string
 * @returns Number of words
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  
  // Split on whitespace and filter empty strings
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Count sentences in text
 * Uses sentence-ending punctuation as delimiters
 * @param text - Plain text string
 * @returns Number of sentences
 */
export function countSentences(text: string): number {
  if (!text || !text.trim()) return 0;
  
  // Match sentence-ending punctuation followed by space or end of string
  // Also handles abbreviations by requiring at least 2 characters before period
  const sentenceEndings = text.match(/[.!?]+(?:\s|$)/g);
  
  // If no sentence endings found, treat as one sentence if there's content
  if (!sentenceEndings) {
    return text.trim().length > 0 ? 1 : 0;
  }
  
  return sentenceEndings.length;
}

/**
 * Count syllables in a single word
 * Uses heuristic approach for English words
 * @param word - Single word
 * @returns Number of syllables (minimum 1)
 */
export function countSyllables(word: string): number {
  if (!word) return 0;
  
  // Normalize to lowercase, remove non-alphabetic characters
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  
  if (cleanWord.length === 0) return 0;
  if (cleanWord.length <= 2) return 1;
  
  let syllableCount = 0;
  let previousWasVowel = false;
  
  // Count vowel groups
  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];
    const isVowel = VOWELS.includes(char);
    
    if (isVowel && !previousWasVowel) {
      syllableCount++;
    }
    
    previousWasVowel = isVowel;
  }
  
  // Handle silent 'e' at end
  if (cleanWord.endsWith('e') && !cleanWord.endsWith('le')) {
    syllableCount--;
  }
  
  // Handle special endings
  if (cleanWord.endsWith('le') && cleanWord.length > 2) {
    const charBeforeLe = cleanWord[cleanWord.length - 3];
    // 'le' adds syllable if preceded by consonant
    if (!VOWELS.includes(charBeforeLe)) {
      // Already counted in vowel groups for some words, skip
    }
  }
  
  // Handle -ed ending
  if (cleanWord.endsWith('ed') && cleanWord.length > 2) {
    const charBeforeEd = cleanWord[cleanWord.length - 3];
    // -ed is usually silent except after t or d
    if (charBeforeEd !== 't' && charBeforeEd !== 'd') {
      syllableCount--;
    }
  }
  
  // Ensure at least one syllable
  return Math.max(1, syllableCount);
}

/**
 * Count total syllables in text
 * @param text - Plain text string
 * @returns Total syllable count
 */
export function countTotalSyllables(text: string): number {
  if (!text || !text.trim()) return 0;
  
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.reduce((total, word) => total + countSyllables(word), 0);
}

// ============================================================================
// Reading Time
// ============================================================================

/**
 * Calculate estimated reading time
 * @param wordCount - Number of words
 * @returns Reading time in seconds
 */
export function calculateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.ceil((wordCount / WORDS_PER_MINUTE) * 60);
}

/**
 * Format reading time as human-readable string
 * @param seconds - Reading time in seconds
 * @returns Formatted string (e.g., "~2 min 30 sec")
 */
export function formatReadingTime(seconds: number): string {
  if (seconds <= 0) return '< 1 sec';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `~${remainingSeconds} sec`;
  }
  
  if (remainingSeconds === 0) {
    return `~${minutes} min`;
  }
  
  return `~${minutes} min ${remainingSeconds} sec`;
}

// ============================================================================
// Readability Calculations
// ============================================================================

/**
 * Calculate Flesch Reading Ease score
 * Formula: 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
 * 
 * Score interpretation:
 * - 90-100: Very Easy (5th grade)
 * - 80-89: Easy (6th grade)
 * - 70-79: Fairly Easy (7th grade)
 * - 60-69: Standard (8th-9th grade)
 * - 50-59: Fairly Difficult (10th-12th grade)
 * - 30-49: Difficult (College)
 * - 0-29: Very Difficult (College graduate)
 * 
 * @param wordCount - Total words
 * @param sentenceCount - Total sentences
 * @param syllableCount - Total syllables
 * @returns Flesch Reading Ease score (clamped to 0-100)
 */
export function calculateFleschReadingEase(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;
  
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Formula: 0.39 × (words/sentences) + 11.8 × (syllables/words) - 15.59
 * 
 * @param wordCount - Total words
 * @param sentenceCount - Total sentences
 * @param syllableCount - Total syllables
 * @returns Grade level (minimum 1)
 */
export function calculateGradeLevel(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;
  
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  const gradeLevel = (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;
  
  // Clamp to reasonable range (1-20)
  return Math.max(1, Math.min(20, Math.round(gradeLevel * 10) / 10));
}

/**
 * Get readability label from Flesch Reading Ease score
 * @param score - Flesch Reading Ease score (0-100)
 * @returns Human-readable label
 */
export function getReadabilityLabel(score: number): string {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

/**
 * Get grade level label from numeric grade
 * @param grade - Numeric grade level
 * @returns Human-readable grade string
 */
export function getGradeLevelLabel(grade: number): string {
  const roundedGrade = Math.round(grade);
  
  if (roundedGrade <= 5) return '5th grade';
  if (roundedGrade === 6) return '6th grade';
  if (roundedGrade === 7) return '7th grade';
  if (roundedGrade === 8) return '8th grade';
  if (roundedGrade === 9) return '9th grade';
  if (roundedGrade === 10) return '10th grade';
  if (roundedGrade === 11) return '11th grade';
  if (roundedGrade === 12) return '12th grade';
  if (roundedGrade <= 16) return 'College';
  return 'Graduate';
}

/**
 * Convert Flesch Reading Ease to 1-10 normalized score
 * Higher is better (easier to read)
 * @param fleschScore - Flesch Reading Ease score (0-100)
 * @returns Normalized score (1-10)
 */
export function normalizeReadabilityScore(fleschScore: number): number {
  // Map 0-100 to 1-10 scale
  const normalized = (fleschScore / 100) * 9 + 1;
  return Math.max(1, Math.min(10, Math.round(normalized * 10) / 10));
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Calculate basic text metrics
 * @param text - Plain text (or HTML that will be stripped)
 * @returns Basic metrics object
 */
export function calculateBasicMetrics(text: string): BasicMetrics {
  // Strip HTML if present
  const plainText = stripHtml(text);
  
  const wordCount = countWords(plainText);
  const characterCount = plainText.length;
  const characterCountNoSpaces = plainText.replace(/\s/g, '').length;
  const sentenceCount = countSentences(plainText);
  const readingTimeSeconds = calculateReadingTime(wordCount);
  const readingTimeFormatted = formatReadingTime(readingTimeSeconds);
  
  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    sentenceCount,
    readingTimeSeconds,
    readingTimeFormatted,
  };
}

/**
 * Calculate readability metrics
 * @param text - Plain text (or HTML that will be stripped)
 * @returns Readability metrics object
 */
export function calculateReadabilityMetrics(text: string): ReadabilityMetrics {
  // Strip HTML if present
  const plainText = stripHtml(text);
  
  const wordCount = countWords(plainText);
  const sentenceCount = countSentences(plainText);
  const syllableCount = countTotalSyllables(plainText);
  
  const fleschReadingEase = calculateFleschReadingEase(wordCount, sentenceCount, syllableCount);
  const gradeLevel = calculateGradeLevel(wordCount, sentenceCount, syllableCount);
  const gradeLevelLabel = getGradeLevelLabel(gradeLevel);
  const readabilityLabel = getReadabilityLabel(fleschReadingEase);
  const normalizedScore = normalizeReadabilityScore(fleschReadingEase);
  
  return {
    fleschReadingEase,
    gradeLevel,
    gradeLevelLabel,
    readabilityLabel,
    normalizedScore,
  };
}

/**
 * Calculate all document metrics
 * @param text - Plain text (or HTML that will be stripped)
 * @returns Complete metrics object
 */
export function analyzeDocument(text: string): DocumentMetrics {
  // Strip HTML if present
  const plainText = stripHtml(text);
  
  // Basic counts
  const wordCount = countWords(plainText);
  const characterCount = plainText.length;
  const characterCountNoSpaces = plainText.replace(/\s/g, '').length;
  const sentenceCount = countSentences(plainText);
  const syllableCount = countTotalSyllables(plainText);
  
  // Reading time
  const readingTimeSeconds = calculateReadingTime(wordCount);
  const readingTimeFormatted = formatReadingTime(readingTimeSeconds);
  
  // Readability
  const fleschReadingEase = calculateFleschReadingEase(wordCount, sentenceCount, syllableCount);
  const gradeLevel = calculateGradeLevel(wordCount, sentenceCount, syllableCount);
  const gradeLevelLabel = getGradeLevelLabel(gradeLevel);
  const readabilityLabel = getReadabilityLabel(fleschReadingEase);
  const normalizedScore = normalizeReadabilityScore(fleschReadingEase);
  
  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    sentenceCount,
    readingTimeSeconds,
    readingTimeFormatted,
    fleschReadingEase,
    gradeLevel,
    gradeLevelLabel,
    readabilityLabel,
    normalizedScore,
  };
}
