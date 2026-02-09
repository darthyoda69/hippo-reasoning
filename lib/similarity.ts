/**
 * Hippo Reasoning — Trace Similarity Search
 *
 * Pure TypeScript TF-IDF cosine similarity implementation.
 * No external dependencies. Used to rank reasoning traces
 * by semantic relevance to a query instead of just recency.
 */

import type { ReasoningTrace } from './hippo';

// ─── Tokenization ───────────────────────────────────────────────

/** Basic stop words to ignore during similarity computation. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'they', 'them', 'their', 'about', 'up',
]);

/**
 * Tokenize text into lowercase terms, splitting on whitespace and punctuation.
 * Filters out stop words and tokens shorter than 2 characters.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.,;:!?'"()\[\]{}<>\/\\|@#$%^&*+=~`]+/)
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
}

// ─── TF-IDF ─────────────────────────────────────────────────────

/** Term frequency: count of each term in a token list. */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  // Normalize by total token count to avoid length bias
  const total = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / total);
  }
  return tf;
}

/**
 * Inverse document frequency for a corpus of token lists.
 * IDF(t) = log(N / (1 + df(t))) where df(t) = number of documents containing term t.
 * The +1 in the denominator avoids division by zero.
 */
function computeIDF(corpus: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = corpus.length;

  // Count document frequency for each term
  const df = new Map<string, number>();
  for (const tokens of corpus) {
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  for (const [term, docFreq] of df) {
    idf.set(term, Math.log(N / (1 + docFreq)));
  }

  return idf;
}

/** Compute a TF-IDF vector as a Map<term, weight>. */
function computeTFIDF(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const tfidf = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) ?? 0;
    tfidf.set(term, tfVal * idfVal);
  }
  return tfidf;
}

// ─── Cosine Similarity ─────────────────────────────────────────

/** Cosine similarity between two sparse vectors represented as Maps. */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, weight] of a) {
    normA += weight * weight;
    const bWeight = b.get(term);
    if (bWeight !== undefined) {
      dotProduct += weight * bWeight;
    }
  }

  for (const [, weight] of b) {
    normB += weight * weight;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Compute text similarity between two strings using TF-IDF cosine similarity.
 *
 * Treats the two strings as a two-document corpus, computes TF-IDF vectors
 * for each, and returns their cosine similarity (0 = no overlap, 1 = identical).
 */
export function computeTextSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const corpus = [tokensA, tokensB];
  const idf = computeIDF(corpus);

  const tfidfA = computeTFIDF(computeTF(tokensA), idf);
  const tfidfB = computeTFIDF(computeTF(tokensB), idf);

  return cosineSimilarity(tfidfA, tfidfB);
}

/**
 * Build a combined text representation of a trace for similarity comparison.
 * Concatenates the query, tool names, and summary into one searchable string.
 */
function traceToText(trace: ReasoningTrace): string {
  const parts: string[] = [trace.query];

  if (trace.toolsUsed.length > 0) {
    parts.push(trace.toolsUsed.join(' '));
  }

  if (trace.summary) {
    parts.push(trace.summary);
  }

  return parts.join(' ');
}

/**
 * Find the most similar traces to a query, ranked by TF-IDF cosine similarity.
 *
 * Builds a corpus from all trace texts plus the query, computes IDF across
 * the whole corpus, then ranks traces by their cosine similarity to the query.
 *
 * @param query   - The search query to match against
 * @param traces  - The pool of traces to rank
 * @param topK    - Maximum number of traces to return (default: 3)
 * @returns       - Traces sorted by descending similarity score
 */
export function findSimilarTraces(
  query: string,
  traces: ReasoningTrace[],
  topK = 3,
): ReasoningTrace[] {
  if (traces.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return traces.slice(0, topK);

  // Build the corpus: query doc + each trace doc
  const traceTexts = traces.map(traceToText);
  const traceTokens = traceTexts.map(tokenize);
  const corpus = [queryTokens, ...traceTokens];

  // Compute IDF over the full corpus for better term discrimination
  const idf = computeIDF(corpus);

  // Compute query TF-IDF vector
  const queryTFIDF = computeTFIDF(computeTF(queryTokens), idf);

  // Score each trace
  const scored = traces.map((trace, i) => {
    const traceTFIDF = computeTFIDF(computeTF(traceTokens[i]), idf);
    const score = cosineSimilarity(queryTFIDF, traceTFIDF);
    return { trace, score };
  });

  // Sort by descending similarity
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(s => s.trace);
}
